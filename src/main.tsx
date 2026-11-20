import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './store'
import { Omokage } from './omokage/Omokage.tsx'
import { AuthGate } from './AuthGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <AppProvider>
        {new URLSearchParams(location.search).has('legacy') ? <App /> : <Omokage />}
      </AppProvider>
    </AuthGate>
  </StrictMode>,
)

// New deploys: the service worker installs in the background and takes over on the next load, which left the
// installed app showing the old build until a second reload. Reload once as soon as a new worker takes over
// (not on the very first install, when there was no previous worker to replace).
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had || reloaded) return;
    reloaded = true;
    location.reload();
  });
}
