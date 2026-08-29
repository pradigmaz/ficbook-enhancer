import React from 'react'
import { createRoot } from 'react-dom/client'
import Popup from './Popup'
import '../styles/index.css' // Используем те же стили Tailwind

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)