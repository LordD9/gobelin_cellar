import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { getBasePath } from './basePath'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={getBasePath() || undefined}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
