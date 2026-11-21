import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SuperMeApp from './SuperMeApp';
import SuperMeAdminApp from './SuperMeAdminApp';
import './styles.css';
import './superme.css';

const params = new URLSearchParams(window.location.search);
const isSuperMeAdmin = params.get('supermeAdmin') === '1';
const isSuperMePreview = params.get('superme') === '1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isSuperMeAdmin ? <SuperMeAdminApp /> : isSuperMePreview ? <SuperMeApp /> : <App />}</React.StrictMode>,
);
