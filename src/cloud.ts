import type { Api } from './cloudSync';

/**
 * Minimal Supabase client (auth + REST) built on fetch - no dependencies.
 * Google sign-in uses the PKCE flow: we send a challenge, Supabase redirects back with ?code=,
 * and we exchange the code + verifier for a session. Pure module: all browser bits are injected
 * (see cloudClient.ts), so it is testable in Node.
 */

export interface CloudUser {
  id: string;
  email: string | null;
}

export interface CloudSession {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  user: CloudUser;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class CloudHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'CloudHttpError';
    this.status = status;
  }
}

export const SESSION_KEY = 'pulse_auth_session';
export const VERIFIER_KEY = 'pulse_pkce_verifier';

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  bytes.forEach(b => {
    s += String.fromCharCode(b);
  });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const randomVerifier = (): string => {
  const a = new Uint8Array(48);
  crypto.getRandomValues(a);
  return b64url(a); // 64 URL-safe chars
};

export const pkceChallenge = async (verifier: string): Promise<string> =>
  b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));

export interface CloudConfig {
  url: string;
  key: string;
  storage: StorageLike;
  fetchFn?: typeof fetch;
  nowSec?: () => number;
}

export interface CloudStorage {
  put: (bucket: string, path: string, blob: Blob) => Promise<void>;
  get: (bucket: string, path: string) => Promise<Blob>;
  remove: (bucket: string, paths: string[]) => Promise<void>;
}

export interface Cloud extends Api {
  storage: CloudStorage;
  getSession: () => CloudSession | null;
  subscribe: (fn: () => void) => () => void;
  startGoogleLogin: (redirectTo: string) => Promise<string>;
  handleRedirect: (href: string) => Promise<{ handled: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

export const createCloud = (cfg: CloudConfig): Cloud => {
  const base = cfg.url.replace(/\/+$/, '');
  const doFetch: typeof fetch = cfg.fetchFn ?? ((...args) => fetch(...args));
  const nowSec = cfg.nowSec ?? (() => Math.floor(Date.now() / 1000));
  const listeners = new Set<() => void>();
  let session: CloudSession | null = null;
  let refreshing: Promise<CloudSession | null> | null = null;

  try {
    const raw = cfg.storage.getItem(SESSION_KEY);
    session = raw ? (JSON.parse(raw) as CloudSession) : null;
  } catch {
    session = null;
  }

  const save = (s: CloudSession | null) => {
    session = s;
    try {
      if (s) cfg.storage.setItem(SESSION_KEY, JSON.stringify(s));
      else cfg.storage.removeItem(SESSION_KEY);
    } catch {
      // storage unavailable: session lives in memory only
    }
    listeners.forEach(l => l());
  };

  const authPost = async (path: string, body: unknown, token?: string) => {
    const res = await doFetch(`${base}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      throw new CloudHttpError(res.status, json?.msg || json?.error_description || json?.message || res.statusText || 'Request failed');
    }
    return json;
  };

  const toSession = (j: any): CloudSession => ({
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: typeof j.expires_at === 'number' ? j.expires_at : nowSec() + Number(j.expires_in ?? 3600),
    user: { id: j.user.id, email: j.user.email ?? null },
  });

  const refresh = (): Promise<CloudSession | null> => {
    if (!session) return Promise.resolve(null);
    if (refreshing) return refreshing;
    const token = session.refresh_token;
    refreshing = (async () => {
      try {
        const s = toSession(await authPost('token?grant_type=refresh_token', { refresh_token: token }));
        save(s);
        return s;
      } catch (e) {
        // Only a definitive rejection ends the session; network errors / rate limits keep it.
        if (e instanceof CloudHttpError && (e.status === 400 || e.status === 401 || e.status === 403)) {
          save(null);
          return null;
        }
        throw e;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };

  const getToken = async (): Promise<string> => {
    if (!session) throw new CloudHttpError(401, 'Not signed in');
    if (session.expires_at - nowSec() < 60) {
      try {
        if (!(await refresh())) throw new CloudHttpError(401, 'Session expired');
      } catch (e) {
        if (e instanceof CloudHttpError) throw e;
        // offline: fall through and try with the current token
      }
    }
    if (!session) throw new CloudHttpError(401, 'Session expired');
    return session.access_token;
  };

  const request: Api['request'] = async (method, path, opts = {}) => {
    const qs = opts.query ? '?' + new URLSearchParams(opts.query).toString() : '';
    const send = (token: string) =>
      doFetch(`${base}/rest/v1/${path}${qs}`, {
        method,
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...opts.headers,
        },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });

    let res = await send(await getToken());
    if (res.status === 401) {
      const s = await refresh();
      if (s) res = await send(s.access_token);
    }
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try {
        msg = JSON.parse(text).message ?? text;
      } catch {
        // not JSON
      }
      throw new CloudHttpError(res.status, msg || res.statusText || 'Request failed');
    }
    return text ? JSON.parse(text) : null;
  };

  /** Authenticated fetch against the Storage API (retries once with a fresh token). */
  const sendStorage = async (path: string, init: RequestInit & { headers?: Record<string, string> }): Promise<Response> => {
    const go = (token: string) => doFetch(`${base}/storage/v1/${path}`, { ...init, headers: { apikey: cfg.key, Authorization: `Bearer ${token}`, ...init.headers } });
    let res = await go(await getToken());
    if (res.status === 401) {
      const s = await refresh();
      if (s) res = await go(s.access_token);
    }
    if (!res.ok) throw new CloudHttpError(res.status, (await res.text().catch(() => '')) || res.statusText || 'Storage request failed');
    return res;
  };
  const storage: CloudStorage = {
    put: async (bucket, path, blob) => { await sendStorage(`object/${bucket}/${path}`, { method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' }, body: blob }); },
    get: async (bucket, path) => (await sendStorage(`object/authenticated/${bucket}/${path}`, { method: 'GET' })).blob(),
    remove: async (bucket, paths) => { await sendStorage(`object/${bucket}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }) }); },
  };

  const startGoogleLogin = async (redirectTo: string): Promise<string> => {
    const verifier = randomVerifier();
    cfg.storage.setItem(VERIFIER_KEY, verifier);
    const q = new URLSearchParams({
      provider: 'google',
      redirect_to: redirectTo,
      code_challenge: await pkceChallenge(verifier),
      code_challenge_method: 's256',
    });
    return `${base}/auth/v1/authorize?${q.toString()}`;
  };

  const handleRedirect = async (href: string): Promise<{ handled: boolean; error?: string }> => {
    const u = new URL(href);
    const hash = new URLSearchParams(u.hash.replace(/^#/, ''));
    const err =
      u.searchParams.get('error_description') ?? hash.get('error_description') ?? u.searchParams.get('error') ?? hash.get('error');
    if (err) return { handled: true, error: err };

    const code = u.searchParams.get('code');
    if (!code) return { handled: false };

    const verifier = cfg.storage.getItem(VERIFIER_KEY);
    if (!verifier) return { handled: true, error: 'Sign-in expired. Please try again.' };
    try {
      const s = toSession(await authPost('token?grant_type=pkce', { auth_code: code, code_verifier: verifier }));
      cfg.storage.removeItem(VERIFIER_KEY);
      save(s);
      return { handled: true };
    } catch (e) {
      return { handled: true, error: e instanceof Error ? e.message : 'Sign-in failed' };
    }
  };

  const signOut = async () => {
    const token = session?.access_token;
    save(null);
    if (token) {
      try {
        await authPost('logout?scope=local', {}, token);
      } catch {
        // already signed out locally; server-side revoke is best effort
      }
    }
  };

  return {
    getSession: () => session,
    subscribe: fn => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    startGoogleLogin,
    handleRedirect,
    signOut,
    request,
    storage,
  };
};
