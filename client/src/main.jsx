import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './styles/bootstrap.scss';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/animations.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
