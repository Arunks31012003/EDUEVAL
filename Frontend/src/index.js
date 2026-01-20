import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>{/* Commented out for development debugging */}
    <App />
  //</React.StrictMode>
);

// Disable right-click for the entire application
//document.addEventListener('contextmenu', event => event.preventDefault());

// Disable text selection for the entire application
//document.addEventListener('selectstart', event => event.preventDefault());

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();