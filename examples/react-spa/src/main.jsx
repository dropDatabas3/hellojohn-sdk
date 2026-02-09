import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelloJohnProvider } from "@hellojohn/react";
import App from "./App";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import DashboardPage from "./pages/Dashboard";
import CallbackPage from "./pages/Callback";

const DOMAIN = import.meta.env.VITE_HELLOJOHN_DOMAIN || "http://localhost:8080";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || "my-spa";
const TENANT_ID = import.meta.env.VITE_TENANT_ID || "local";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelloJohnProvider
      domain={DOMAIN}
      clientID={CLIENT_ID}
      tenantID={TENANT_ID}
      redirectURI={window.location.origin + "/callback"}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<DashboardPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="callback" element={<CallbackPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HelloJohnProvider>
  </React.StrictMode>
);
