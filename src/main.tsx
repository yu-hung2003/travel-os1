import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { ensureSeeded } from '@/data/seed';
import '@/styles/index.css';

// Import the first trip on first launch, then render.
ensureSeeded().finally(() => {
  // lazy-load the sync engine so Firebase never blocks first paint
  import('@/data/sync/familySync').then((m) => m.resumeSyncIfEnabled());
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
