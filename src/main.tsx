import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { ensureSeeded } from '@/data/seed';
import '@/styles/index.css';

// Import the first trip on first launch, then render.
ensureSeeded().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
