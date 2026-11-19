import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './store'
import { AuthGate } from './AuthGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthGate>
  </StrictMode>,
)
