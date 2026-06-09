import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';

import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';

if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Buffer = Buffer;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
    <ErrorBoundary>
      <BrowserRouter>
          <App />
      </BrowserRouter>
    </ErrorBoundary>,
);
