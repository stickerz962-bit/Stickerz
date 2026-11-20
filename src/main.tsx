import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SuperMeApp from './SuperMeApp';
import './styles.css';
import './superme.css';

const isSuperMePreview = new URLSearchParams(window.location.search).get('superme') === '1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isSuperMePreview ? <SuperMeApp /> : <App />}</React.StrictMode>,
);
