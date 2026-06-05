import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ignorar erros benignos de conexão WebSocket do Vite no ambiente sandbox do AI Studio
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason.message || event.reason) : '';
    if (reasonStr.toLowerCase().includes('websocket') || reasonStr.toLowerCase().includes('ws://')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const messageStr = event.message || '';
    if (messageStr.toLowerCase().includes('websocket') || messageStr.toLowerCase().includes('ws://')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

