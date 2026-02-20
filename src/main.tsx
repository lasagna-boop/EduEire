// App entry point: loads global styles, mounts React, and wraps <App /> with providers.

import "bootstrap/dist/css/bootstrap.min.css"; //CSS framework
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // SPA routе
import App from "./App";
import { AuthProvider } from "./context/AuthContext"; //global auth state
import "./styles/layout.css";
import "./styles/feed.css";
import "./styles/landing.css";
import "./styles/login.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);