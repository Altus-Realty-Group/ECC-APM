import "@/styles/index.css";  // <— must be FIRST

// import "./dev/tap";
// Removed mountEnhancer AND dev/index - asset cards now use proper routing
import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { installSessionBoundary } from "@/lib/sessionScope";
import EccErrorBoundary from "./components/EccErrorBoundary";
import DevDiagBar from "./components/DevDiagBar";
import App from "./App";

// Supported identity boundary: whatever owns sign-in/out or account switching dispatches
// "ecc:session-boundary" on window; cached data is purged and in-flight responses are rejected.
installSessionBoundary(queryClient);

if (import.meta.env.DEV) {
  // React StrictMode + aborted fetches during HMR
  window.addEventListener("unhandledrejection", (e: any) => {
    if (e?.reason?.name === "AbortError") e.preventDefault();
  });
  window.addEventListener("error", (e: any) => {
    if (String(e?.message || "").includes("AbortError")) e.preventDefault();
  });
}

const Mode: React.ComponentType<any> = import.meta.env.DEV ? React.Fragment : React.StrictMode;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Mode>
    <EccErrorBoundary>
      {import.meta.env.DEV && <DevDiagBar />}
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
        </Router>
      </QueryClientProvider>
    </EccErrorBoundary>
  </Mode>
);
