import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

if (process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("react-beautiful-dnd")) {
      return; // Suppress react-beautiful-dnd errors
    }
    originalError(...args);
  };
}

createRoot(document.getElementById("root")!).render(
  //<StrictMode>
  <App />
  //</StrictMode>,
);
