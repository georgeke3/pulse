import { useSyncExternalStore } from 'react';
import { createCloud } from './cloud';
import type { Cloud, CloudSession } from './cloud';

/**
 * Browser singleton. Cloud mode is on when both env vars are set (Vercel project settings /
 * .env.local); otherwise the app runs local-only exactly like before.
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY   (the public "publishable"/anon key - safe in the browser)
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const cloudConfigured = Boolean(url && key);
export const cloud: Cloud | null = url && key ? createCloud({ url, key, storage: window.localStorage }) : null;

const noSubscribe = () => () => {};
const noSession = (): CloudSession | null => null;

export const useCloudSession = (): CloudSession | null =>
  useSyncExternalStore(cloud ? cloud.subscribe : noSubscribe, cloud ? cloud.getSession : noSession);

let initPromise: Promise<{ handled: boolean; error?: string }> | null = null;

/** Completes a Google sign-in if we were just redirected back with ?code=. Runs once per page load. */
export const initCloud = (): Promise<{ handled: boolean; error?: string }> => {
  if (!cloud) return Promise.resolve({ handled: false });
  initPromise ??= (async () => {
    const result = await cloud.handleRedirect(window.location.href);
    if (result.handled) {
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    }
    return result;
  })();
  return initPromise;
};
