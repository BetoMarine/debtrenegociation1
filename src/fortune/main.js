import "./first-build.css";
import { boot } from "./first-build/app.js";
import { registerServiceWorker } from "../register-sw.js";

document.documentElement.classList.add("fortune-root");
registerServiceWorker();
boot();
