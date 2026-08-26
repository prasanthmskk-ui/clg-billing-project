import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { registerServiceWorker } from '../lib/ocr/registerServiceWorker'

registerServiceWorker()

createRoot(document.getElementById('root')).render(<App />)
