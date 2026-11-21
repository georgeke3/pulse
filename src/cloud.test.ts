import { describe, it, expect } from 'vitest';
import { CloudHttpError, SESSION_KEY, VERIFIER_KEY, createCloud, pkceChallenge, randomVerifier } from './cloud';

const memoryStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sessionBody = (id = 'u1', expiresAt = 2_000_000_000, rt = 'rt1') => ({
  access_token: 'at-' + rt, refresh_token: rt, expires_at: expiresAt, expires_in: 3600, user: { id, email: 'g@example.com' },
});

describe('PKCE helpers', () => {
  it('matches the RFC 7636 test vector', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('generates url-safe verifiers of valid length', () => {
    const v = randomVerifier();
    expect(/^[A-Za-z0-9_-]{43,128}$/.test(v)).toBe(true);
  });
});

describe('Google sign-in flow', () => {
  it('builds the authorize URL with a PKCE challenge and stores the verifier', async () => {
    const storage = memoryStorage();
    const cloud = createCloud({ url: 'https://x.supabase.co/', key: 'pk', storage });
    const url = new URL(await cloud.startGoogleLogin('https://app.example/'));
    expect(url.origin + url.pathname).toBe('https://x.supabase.co/auth/v1/authorize');
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('redirect_to')).toBe('https://app.example/');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    const verifier = storage.getItem(VERIFIER_KEY)!;
    expect(url.searchParams.get('code_challenge')).toBe(await pkceChallenge(verifier));
  });

  it('exchanges ?code= for a session and persists it', async () => {
    const storage = memoryStorage();
    let seen: any = null;
    const fetchFn = (async (u: string, init: any) => {
      seen = { u, body: JSON.parse(init.body), apikey: init.headers.apikey };
      return json(200, sessionBody());
    }) as unknown as typeof fetch;
    const cloud = createCloud({ url: 'https://x.supabase.co', key: 'pk', storage, fetchFn });
    await cloud.startGoogleLogin('https://app.example/');
    const verifier = storage.getItem(VERIFIER_KEY)!;
    const r = await cloud.handleRedirect('https://app.example/?code=abc123');
    expect(r.handled).toBe(true);
    expect(r.error).toBeUndefined();
    expect(seen.u).toBe('https://x.supabase.co/auth/v1/token?grant_type=pkce');
    expect(seen.body).toEqual({ auth_code: 'abc123', code_verifier: verifier });
    expect(seen.apikey).toBe('pk');
    expect(cloud.getSession()!.user.id).toBe('u1');
    expect(storage.getItem(VERIFIER_KEY)).toBe(null);
    expect(JSON.parse(storage.getItem(SESSION_KEY)!).access_token).toBe('at-rt1');
    // a fresh client (page reload) restores the session
    expect(createCloud({ url: 'https://x.supabase.co', key: 'pk', storage }).getSession()!.user.email).toBe('g@example.com');
  });

  it('reports provider errors and ignores normal page loads', async () => {
    const cloud = createCloud({ url: 'https://x.supabase.co', key: 'pk', storage: memoryStorage() });
    expect((await cloud.handleRedirect('https://app.example/')).handled).toBe(false);
    const r = await cloud.handleRedirect('https://app.example/?error=server_error&error_description=Unsupported+provider');
    expect(r.handled).toBe(true);
    expect(r.error).toBe('Unsupported provider');
    expect((await cloud.handleRedirect('https://app.example/?code=zzz')).error).toBeTruthy(); // no verifier stored
  });
});

describe('REST requests and token refresh', () => {
  it('refreshes an expiring token before calling the API and sends both headers', async () => {
    const storage = memoryStorage();
    storage.setItem(SESSION_KEY, JSON.stringify({ ...sessionBody('u1', 1000, 'old'), access_token: 'stale' }));
    const calls: any[] = [];
    const fetchFn = (async (u: string, init: any) => {
      calls.push({ u, init });
      if (u.includes('grant_type=refresh_token')) return json(200, sessionBody('u1', 5000, 'new'));
      return json(200, [{ ok: 1 }]);
    }) as unknown as typeof fetch;
    const cloud = createCloud({ url: 'https://x.supabase.co', key: 'pk', storage, fetchFn, nowSec: () => 2000 });
    const out = await cloud.request('GET', 'pulse_days', { query: { select: '*' } });
    expect(out).toEqual([{ ok: 1 }]);
    expect(calls[0].u).toContain('grant_type=refresh_token');
    expect(JSON.parse(calls[0].init.body)).toEqual({ refresh_token: 'old' });
    expect(calls[1].u).toBe('https://x.supabase.co/rest/v1/pulse_days?select=*');
    expect(calls[1].init.headers.Authorization).toBe('Bearer at-new');
    expect(calls[1].init.headers.apikey).toBe('pk');
  });

  it('signs out only when the refresh token is definitively rejected', async () => {
    const mk = (status: number) => {
      const storage = memoryStorage();
      storage.setItem(SESSION_KEY, JSON.stringify(sessionBody('u1', 1000, 'old')));
      const fetchFn = (async () => json(status, { msg: 'nope' })) as unknown as typeof fetch;
      return createCloud({ url: 'https://x.supabase.co', key: 'pk', storage, fetchFn, nowSec: () => 2000 });
    };
    const rejected = mk(400);
    let err: unknown = null;
    try { await rejected.request('GET', 't'); } catch (e) { err = e; }
    expect(err instanceof CloudHttpError).toBe(true);
    expect(rejected.getSession()).toBe(null);

    const ratelimited = mk(429);
    try { await ratelimited.request('GET', 't'); } catch { /* expected */ }
    expect(ratelimited.getSession() !== null).toBe(true); // still signed in
  });

  it('surfaces API errors with their message', async () => {
    const storage = memoryStorage();
    storage.setItem(SESSION_KEY, JSON.stringify(sessionBody()));
    const fetchFn = (async () => json(403, { message: 'permission denied' })) as unknown as typeof fetch;
    const cloud = createCloud({ url: 'https://x.supabase.co', key: 'pk', storage, fetchFn, nowSec: () => 10 });
    let msg = '';
    try { await cloud.request('POST', 'pulse_days', { body: [] }); } catch (e) { msg = (e as Error).message; }
    expect(msg).toBe('permission denied');
  });
});

describe('Storage', () => {
  const signedIn = () => {
    const storage = memoryStorage();
    storage.setItem(SESSION_KEY, JSON.stringify(sessionBody()));
    return storage;
  };
  it('uploads, downloads and removes with the user token', async () => {
    const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: unknown }> = [];
    const fetchFn = (async (u: string, init: any) => {
      calls.push({ url: u, method: init.method, headers: init.headers, body: init.body });
      return init.method === 'GET' ? new Response(new Blob(['img'], { type: 'image/jpeg' })) : json(200, { ok: true });
    }) as unknown as typeof fetch;
    const cloud = createCloud({ url: 'https://x.supabase.co', key: 'pk', storage: signedIn(), fetchFn, nowSec: () => 2000 });
    await cloud.storage.put('b', 'u1/a.jpg', new Blob(['x'], { type: 'image/jpeg' }));
    const got = await cloud.storage.get('b', 'u1/a.jpg');
    await cloud.storage.remove('b', ['u1/a.jpg']);
    expect(calls[0].url).toBe('https://x.supabase.co/storage/v1/object/b/u1/a.jpg');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['Content-Type']).toBe('image/jpeg');
    expect(calls[0].headers['x-upsert']).toBe('true');
    expect(calls[0].headers.Authorization).toBe('Bearer at-rt1');
    expect(calls[1].url).toBe('https://x.supabase.co/storage/v1/object/authenticated/b/u1/a.jpg');
    expect(await got.text()).toBe('img');
    expect(calls[2].method).toBe('DELETE');
    expect(JSON.parse(calls[2].body as string)).toEqual({ prefixes: ['u1/a.jpg'] });
  });
  it('throws a CloudHttpError on a failed upload', async () => {
    const fetchFn = (async () => new Response('too big', { status: 413 })) as unknown as typeof fetch;
    const cloud = createCloud({ url: 'https://x.supabase.co', key: 'pk', storage: signedIn(), fetchFn, nowSec: () => 2000 });
    await expect(cloud.storage.put('b', 'p', new Blob(['x']))).rejects.toBeInstanceOf(CloudHttpError);
  });
});
