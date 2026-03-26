import React from 'react';
import ReactDOM from 'react-dom/client';

import { AppRoutes } from './presentation/routes/AppRoutes';
import './presentation/styles/global.css';

import './lib/i18n';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>,
);
