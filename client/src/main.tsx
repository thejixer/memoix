import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router"; // react-router

import { Toaster } from "react-hot-toast";
import App from "./App";
import "./App.css"
import ReactQueryProvider from "./libs/providers/ReactQuery";
// Root element
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ReactQueryProvider>
        <Toaster position="top-right" />
        <App />
      </ReactQueryProvider>
    </BrowserRouter>
  </StrictMode>
);
