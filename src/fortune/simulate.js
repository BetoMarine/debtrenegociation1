/**
 * Engine façade. PoC runs Monte Carlo in the browser.
 * Later: replace the body with `POST /simulate` using the same PlanInput / Forecast.
 */
import { runMonteCarlo } from "./engine.js";

export async function runForecast(plan, options = {}) {
  // Client-side PoC. A hosted engine would POST `plan` and return Forecast JSON.
  return runMonteCarlo(plan, options);
}
