import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import './index.css'

console.log('Starting AI-Coder...')

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
)

console.log('AI-Coder loaded successfully!')