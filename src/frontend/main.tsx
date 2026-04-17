import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./global.css";
import App from "./App.tsx";

const basePath = window.APP_DATA?.basePath ?? "";

createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
);
