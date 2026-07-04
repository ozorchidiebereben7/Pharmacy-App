import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

// Single-file preview entry (built via vite.config.artifact.js) for hosting
// as a Claude Artifact. Uses HashRouter instead of BrowserRouter since this
// runs inside a sandboxed iframe where pushState-based history is unreliable.
createRoot(document.getElementById('root')).render(<App Router={HashRouter} />);
