/** Unbiased read of a bank or insurer offer. Education only. Never a buy. */

export const SAMPLE_OFFER =
  "Guardian Growth Linked Plan \u2014 15-year premium HK$2,000/mo; illustrated return 4.5% p.a.; early surrender charges apply; agent commission may apply.";

function tidy(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function decodeOffer(text) {
  const raw = tidy(text);
  if (!raw) {
    return {
      empty: true,
      conflict: false,
      what: "Paste the offer first. We will put it in plain words.",
      costs: "What you pay shows up here once there is an offer to read.",
      paid: "If someone may earn a fee, it shows here. We will not tell you to buy.",
    };
  }
  if (/guardian growth linked plan/i.test(raw)) {
    return {
      empty: false,
      conflict: true,
      what: "Long insurance+investment plan. HK$2,000 / month for 15 years.",
      costs: "Premium + possible early exit fees. 4.5% is illustrated \u2014 not a promise.",
      paid: "Agent / bank may earn commission. Ask how much.",
    };
  }
  const money = raw.match(/HK\$\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*(?:mo(?:nth)?|year|yr))?/i);
  const years = raw.match(/(\d+)\s*-?\s*years?/i);
  const pct = raw.match(/(\d+(?:\.\d+)?)\s*%/);
  const commission = /commission|trailer|\bagent\b/i.test(raw) && !/no commission/i.test(raw);
  const exit = /surrender|early exit|penalty|charge/i.test(raw);
  const bits = [];
  if (/insurance/i.test(raw) && /invest/i.test(raw)) bits.push("Insurance and investment are tied together.");
  else if (/fund|portfolio|invest/i.test(raw)) bits.push("An investment product, in their words.");
  else if (/insurance|policy|plan/i.test(raw)) bits.push("A plan or policy, in their words.");
  else bits.push("A product described by the bank or insurer.");
  if (money) bits.push(`${money[0].replace(/\s+/g, " ")}${years ? ` for ${years[1]} years.` : "."}`);
  else if (years) bits.push(`The term mentioned is ${years[1]} years.`);
  const costs = [];
  if (money) costs.push(`Payment mentioned: ${money[0].replace(/\s+/g, " ")}.`);
  if (exit) costs.push("Early exit fees may apply.");
  if (pct) costs.push(`${pct[1]}% is illustrated \u2014 not a promise.`);
  if (!costs.length) costs.push("The wording does not state a clear price. Ask what you pay if you stop early.");
  return {
    empty: false,
    conflict: commission || exit,
    what: bits.join(" "),
    costs: costs.join(" "),
    paid: commission
      ? "Agent / bank may earn commission. Ask how much."
      : "The wording does not say who is paid. Ask if anyone earns a fee.",
  };
}
