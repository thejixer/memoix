import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router";
import { Toaster } from "react-hot-toast";

import App from './App.jsx'
import "./App.css"

const root = document.getElementById("root");
// global.Domain = "http://localhost:4848"
globalThis.Domain = "http://localhost:4848"

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
