# Fortune Teller cases

Source of truth for ids: `cases.json` (keep this file in lockstep). **Bob** (`npm test`) before **Maddy** (Safari). Live LOOP / ENTRY still need Safari.

## FT-DATE-01 — readable calendar dates, not tenor strings

**Status:** automated (`npm test`)

**Expect:** Step 3 opens with **Your plan** (`ft-journey`) as the primary readable plan. Fix is a dated **start → end** (6 months assumed until picked) such as Start Sep 2026 / End Mar 2027 — never `3–6 months` or a vague Now+tenor. Stage-stack rows also carry calendar `whenLabel`s. Fix **title** stays `Debt renegotiation · 3 months` / `6 months` / `3 or 6 months`.

**Bob:** catalog + `src/fortune/timeline.test.js` + board / journey

**Maddy (optional live):** Rebuild board after a 3- or 6-month pack. Confirm the timeline answers “when does Fix end?” without hunting stage cards.

## FT-EF-01 — growth pot pin vs emergency fund

**Status:** automated (`npm test`)

**Expect:** Tap / edit **First growth pot**, change planned amount, pin. Emergency fund **now HK$** stays the same. One First growth pot in **Invest** only — no duplicate Plan row. Pinning again with the same amount still one row. Pinning the EF id is a no-op.

**Bob:** catalog + `src/fortune/goals.test.js`

**Maddy (optional live):** Rebuild → board. Note EF amount (0 is allowed). Pin growth pot to 88000. EF unchanged; one Invest pot.

## FT-EF-02 — emergency fund start and complete

**Status:** automated (`npm test`)

**Expect:** Saving a 6-month emergency fund shows **when I start** and **when it is complete** on the plan timeline (`Start Mar 2027 · complete Sep 2027`). Not a vague Stabilize label alone.

**Bob:** catalog + `src/fortune/timeline.test.js`

**Maddy (optional live):** Rebuild board. Confirm EF start sits after Fix finish, and complete is a calendar month.

## FT-INVEST-01 — Invest start + growth line

**Status:** automated (`npm test`)

**Expect:** Timeline answers: when I can **start saving** toward Invest; when I have **enough to start**; over timeframe X how much the growth pot grows under the chosen shelf (Firm / Balanced / Growth / Frontier μ). Projection only. No custody language.

**Bob:** catalog + `src/fortune/timeline.test.js`

**Maddy (optional live):** On the board, read Invest: start-saving date, enough date, and a growth line that names the mix and “Projection only.”

## FT-LOOP-01 — must-fix loop

**Status:** safari_manual (unit slice in `npm test`; **live needs Safari**)

**Expect:**

1. Fortune Rebuild → Heavy / missing payments.
2. **Open Right Door** (`../?from=fortune`). Header (not only footer) shows **Back to Fortune Teller** in English.
3. Tap the header chip. Fortune is **Me today** with **Looks right — open my plan**. Footer stays Fortune **PoC v0.9.x**, not Right Door **PoC v0.8.0**, with no hard refresh (FT-VER-01).
4. Open the board: Fix is **Debt renegotiation · 3 months** or **6 months** (or pick once). Stabilize is emergency fund at current amount (0 allowed). Plan/Invest stay visible.
5. Same header loop for Sunday Pack. Direct RD/Sunday URLs have no Fortune bar.

**Bob:** `from=fortune` href, return-bar copy, Fix handoff, Step 1 gate.

**Maddy:** iPhone Safari on the live `/fortune/` URL. Chrome-in-app does not count.

## FT-ENTRY-01 — every open is Step 1

**Status:** safari_manual (unit slice in `npm test`; **live needs Safari**)

**Expect:** Privacy once. Every later open lands on **Where you are today** (three cards). If a plan exists, **Looks right — open my plan** goes to Step 3 in one tap — it does not auto-skip. Picking a different card still walks Step 2.

**Bob:** `nextAfterStart` / `gateFortuneScreen` always return Step 1 (`where`) after privacy; `canOpenPlan` only when the board was reached.

**Maddy:** Safari. Reload `/fortune/` after a board exists. Must see Step 1, not the board.

## FT-FAIL-01 — hard-fail house

**Status:** automated (`npm test`)

**Expect:** 0 income, 0 savings, HK$15M+ house → `hardFail`, wrecked living/net dials, hold line **does not hold**, no green you're-set. Coach stays (Fix or floor).

**Bob:** catalog + `src/fortune/engine.test.js` (and coach / stabilize kill-test).

**Maddy (optional live):** Add a huge house on a 0/0 rebuild board; confirm honesty line.

## FT-DRAG-01 — drag living goals in time

**Status:** automated (`npm test`); live gesture still **Safari** (Maddy after Bob)

**Expect:** Living rows have **Sooner / Later** (44px) plus a vertical ⋮⋮ handle. Tapping or dragging updates `milestone.months`. The goal stays in its stage. Phase end = `max(months)` of that stage and can extend. Fix stays RD/Sunday 3/6 (user does not invent Fix). EF stays distinct. Dates/tenors remain on the row (FT-DATE-01).

**Bob:** catalog + `src/fortune/time.test.js` + board HTML for Sooner/Later. Engine already models later dates as higher success %.

**Maddy:** iPhone Safari. On a Plan row tap **Later** — date moves forward, stays in Plan. **Sooner** pulls it earlier. Handle up/down scrubs months.

## FT-OVERLAP-01 — soft phase overlap

**Status:** automated (`npm test`); live overlap hint still **Safari** (Maddy after Bob)

**Expect:** Spine Fix → Stabilize → Plan → Invest is **priority**, not hard non-overlapping walls. Stabilize can start at the end of Fix. A Plan goal may sit inside the Fix/Stabilize window and remain Plan. Invest may overlap Plan. Home board is still the **vertical stage stack** — do not resurrect overlapping path pins.

**Bob:** catalog + `src/fortune/time.test.js` (overlap flags, stage unchanged).

**Maddy:** Safari. Pull a Plan goal Sooner into the Stabilize window. Confirm **overlaps Stabilize** on the Plan header; goal does not jump stage.

## FT-VER-01 — Fortune version stamp after RD / Sunday

**Status:** safari_manual (unit slice in `npm test`; **live needs Safari**)

**Expect:**

1. Open `/fortune/`. Footer is **PoC v0.9.8** (Fortune), not **PoC v0.8.0**.
2. Fortune → Right Door (header **Back to Fortune Teller**). Right Door footer is **PoC v0.8.0**.
3. Tap **Back to Fortune Teller**. Fortune footer is still **PoC v0.9.8** — no hard refresh.
4. Same return from Sunday Pack.

**Bob:** MPA shell map (`htmlShellForPath`), SW is injectManifest (no SPA `navigateFallback: "index.html"`), Fortune copy is 0.9.8 and RD/Sunday stay 0.8.0.

**Maddy:** iPhone Safari on live `/fortune/`. Chrome-in-app does not count.
