
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("[VisionOS] Falha crítica no boot:", error);
    container.innerHTML = `<div style="padding: 40px; color: white; background: #0a0a0b; height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; font-family: sans-serif;">
      <h1 style="color: #e11d48; font-weight: 900;">SYSTEM ERROR</h1>
      <p style="opacity: 0.6; font-size: 12px;">Falha ao carregar módulos do kernel.</p>
      <button onclick="window.location.reload()" style="margin-top: 20px; background: #e11d48; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer;">FORCE RESTART</button>
    </div>`;
  }
}
