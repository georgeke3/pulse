import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cloud, initCloud, useCloudSession } from './cloudClient';
import { Loading, SignIn } from './omokage/Loading';

/**
 * Shows the app only for a signed-in user. One tap on "Continue with Google" - no password, no typing.
 * When the Supabase env vars are not set (local dev), the gate is transparent and the app stays local-only.
 */
export const AuthGate = ({ children }: { children: ReactNode }) => {
  if (!cloud) return <>{children}</>;
  return <CloudGate>{children}</CloudGate>;
};

const CloudGate = ({ children }: { children: ReactNode }) => {
  const session = useCloudSession();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void initCloud().then(result => {
      if (!alive) return;
      if (result.error) setError(result.error);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const signIn = async () => {
    if (!cloud) return;
    setBusy(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
      window.location.assign(await cloud.startGoogleLogin(redirectTo));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start sign-in');
      setBusy(false);
    }
  };

  if (!ready) return <Loading label="signing in…" />;
  if (session) return <>{children}</>;
  return <SignIn busy={busy} error={error} onSignIn={() => { void signIn(); }} />;
};
