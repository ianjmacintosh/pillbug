import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import AppRouter from "./components/AppRouter";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
