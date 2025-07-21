import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { GameProvider } from './contexts/GameContext.tsx'
import { Toaster } from "@/components/ui/sonner"
import 'simplebar-react/dist/simplebar.min.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameProvider>
      <App />
      <Toaster />
    </GameProvider>
  </React.StrictMode>,
)