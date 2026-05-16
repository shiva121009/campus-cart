import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./App.css";
import "./components/Shared/shared.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
