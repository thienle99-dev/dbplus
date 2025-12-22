import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./context/ToastContext";
import { DialogProvider } from "./context/DialogContext";
import { AccessibilityProvider } from "./context/AccessibilityProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "./styles/accessibility.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DialogProvider>
            <AccessibilityProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AccessibilityProvider>
          </DialogProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
