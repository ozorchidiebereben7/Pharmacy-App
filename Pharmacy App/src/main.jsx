import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode is intentionally omitted: it double-invokes effects in dev,
// which races two concurrent sql.js/IndexedDB initializations against
// each other on first load (see Engine.create in db/engine.js).
createRoot(document.getElementById('root')).render(<App />)
