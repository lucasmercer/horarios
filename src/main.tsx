import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: sans-serif;">
        <h2>Erro ao carregar aplicativo</h2>
        <p>${message}</p>
        <p><small>${source}:${lineno}:${colno}</small></p>
        <button onclick="window.location.reload()">Recarregar Página</button>
      </div>
    `;
  }
  return false;
};

console.log("Rendering App...");
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("No root element found!");
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
