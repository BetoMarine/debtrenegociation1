import "../styles.css";
import "./pack-build.css";
import { boot } from "./app.js";
import { registerServiceWorker } from "../register-sw.js";

registerServiceWorker();
boot();
