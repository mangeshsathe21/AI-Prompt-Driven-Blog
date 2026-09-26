import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from '@vuer-ai/react-helmet-async'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* HelmetProvider enables react-helmet-async for per-page <title> and meta tags */}
    <HelmetProvider>
      <App />
      {/*
        Global toast container — positioned top-right.
        Individual toasts are triggered via toast() from react-hot-toast.
      */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { maxWidth: '420px' },
          success: { iconTheme: { primary: '#2d6a4f', secondary: '#fff' } },
          error: { iconTheme: { primary: '#e63946', secondary: '#fff' } },
        }}
      />
    </HelmetProvider>
  </StrictMode>,
)
