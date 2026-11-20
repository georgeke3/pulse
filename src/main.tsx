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
