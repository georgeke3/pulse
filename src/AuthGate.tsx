import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cloud, initCloud, useCloudSession } from './cloudClient';

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

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Signing in…</p>
      </div>
    );
  }

  if (session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-full max-w-[448px] space-y-10">
        <header>
          <h1 className="text-5xl font-black tracking-tight mb-2">Omokage</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Mental Load &amp; Resilience</p>
        </header>

        <div className="space-y-4">
          <button
            onClick={() => { void signIn(); }}
            disabled={busy}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-base active:scale-95 transition-all shadow-lg disabled:opacity-50"
          >
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {error && <p className="text-xs font-bold text-red-500 break-words">{error}</p>}
          <p className="text-[10px] font-bold text-gray-400">Your data is stored privately in your own account.</p>
        </div>
      </div>
    </div>
  );
};
