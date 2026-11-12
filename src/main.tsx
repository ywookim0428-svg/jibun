import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './fonts/hanja.css'
import './index.css'
import App from './App'
import { unlockAudio } from './lib/sound'

unlockAudio()
registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
