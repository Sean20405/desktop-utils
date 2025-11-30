import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DesktopProvider } from './context/DesktopContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopProvider>
      <App />
    </DesktopProvider>
  </StrictMode>,
)
