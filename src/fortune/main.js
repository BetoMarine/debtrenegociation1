import "../styles.css";
import { bootV3 } from "./v3/boot.js";
import { registerServiceWorker } from "../register-sw.js";

document.documentElement.classList.add("fortune-root");
registerServiceWorker();
bootV3();
