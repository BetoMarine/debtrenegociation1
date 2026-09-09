import "../styles.css";
import { boot } from "./app.js";
import { registerServiceWorker } from "../register-sw.js";

document.documentElement.classList.add("fortune-root");
registerServiceWorker();
boot();
