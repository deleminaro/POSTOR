import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress known React 19 warnings caused by react-player web components
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Unknown event handler property')) {
    const propStr = String(args[1] || args[0]);
    if (propStr.includes('onBuffer') || propStr.includes('onDuration') || propStr.includes('onPlayback')) {
      return; // Ignore
    }
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Unknown event handler property')) {
    const propStr = String(args[1] || args[0]);
    if (propStr.includes('onBuffer') || propStr.includes('onDuration') || propStr.includes('onPlayback')) {
      return; // Ignore
    }
  }
  originalConsoleWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
