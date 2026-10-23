import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import BootError from './components/BootError';
import './index.css';
import { initializeApi } from './api';

const root = createRoot(document.getElementById('root')!);
initializeApi()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error) => root.render(<BootError error={error} />));
