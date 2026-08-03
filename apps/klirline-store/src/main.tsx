import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { bindAndroidBackButton, bindAppUrlOpen, markNativeShell } from './lib/nativeShell';

markNativeShell();
const unbindBack = bindAndroidBackButton();
const unbindUrls = bindAppUrlOpen();
window.addEventListener(
  'pagehide',
  () => {
    unbindBack();
    unbindUrls();
  },
  { once: true },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
