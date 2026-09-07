import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── Prevent trackpad / scroll wheel from changing <input type="number"> values ──
// Keyboard arrows (↑ ↓) still work normally — only scroll/swipe is blocked.
document.addEventListener('wheel', function preventNumberScroll(e) {
  if (document.activeElement?.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

