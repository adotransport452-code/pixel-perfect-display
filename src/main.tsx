import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent the browser from opening/navigating to a dropped file
// when the user releases it outside an explicit drop-zone.
window.addEventListener("dragover", (e) => { e.preventDefault(); });
window.addEventListener("drop", (e) => { e.preventDefault(); });

createRoot(document.getElementById("root")!).render(<App />);
