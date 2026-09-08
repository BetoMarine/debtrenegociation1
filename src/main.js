import "./styles.css";
import { boot } from "./app.js";
import { registerServiceWorker } from "./register-sw.js";

registerServiceWorker();
boot();
