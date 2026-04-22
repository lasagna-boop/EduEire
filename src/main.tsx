// App entry point: loads global styles, mounts React, and wraps <App /> with providers.

import "bootstrap/dist/css/bootstrap.min.css"; //CSS framework
import "./styles/edu-buttons-tokens.css";
import "./styles/app-theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // SPA routе
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext"; //global auth state
import { ThemeProvider } from "./context/ThemeProvider";
import "./styles/feed.css";
import "./styles/tailwind.css";
import "./styles/login.css";
import "./styles/slide-menu.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);