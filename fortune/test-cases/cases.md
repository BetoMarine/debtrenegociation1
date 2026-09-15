# Fortune Teller cases

Source of truth for ids: `cases.json` (keep this file in lockstep). **Bob** (`npm test`) before **Maddy** (Safari). Live LOOP / ENTRY still need Safari.

## FT-DATE-01 — date or range on every row

**Status:** automated (`npm test`)

**Expect:** Every Fix / Stabilize / Plan / Invest row has `whenLabel` (calendar month or a range such as `3–6 months` / `by Sep 2029`). Fix **title** stays `Debt renegotiation · 3 months` / `6 months` / `3 or 6 months`. The date is secondary (`ft-row-when`), never the `<strong>` title.

**Bob:** catalog + `src/fortune/board.test.js` + `src/fortune/journey.test.js`

**Maddy (optional live):** Rebuild board after a 3- or 6-month pack. Confirm dates under names; Fix wording unchanged.

## FT-EF-01 — growth pot pin vs emergency fund

**Status:** automated (`npm test`)

**Expect:** Tap / edit **First growth pot**, change planned amount, pin. Emergency fund **now HK$** stays the same. One First growth pot in **Invest** only — no duplicate Plan row. Pinning again with the same amount still one row. Pinning the EF id is a no-op.

**Bob:** catalog + `src/fortune/goals.test.js`

**Maddy (optional live):** Rebuild → board. Note EF amount (0 is allowed). Pin growth pot to 88000. EF unchanged; one Invest pot.

## FT-LOOP-01 — must-fix loop

**Status:** safari_manual (unit slice in `npm test`; **live needs Safari**)

**Expect:**

1. Fortune Rebuild → Heavy / missing payments.
2. **Open Right Door** (`../?from=fortune`). Header (not only footer) shows **Back to Fortune Teller** in English.
3. Tap the header chip. Fortune is **Me today** with **Looks right — open my plan**.
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

## FT-DRAG-01 — drag reorder

**Status:** not_built

Reserved for light drag-to-reorder on living goal rows. Programmatic `applyStageOrder` exists; gesture + Safari QA is not a Fortune test case yet. Do not fail Bob for this id.

## FT-OVERLAP-01 — overlapping path pins

**Status:** not_built

Reserved. Step 3 is the vertical Fix → Stabilize → Plan → Invest stack. Do not bring back overlapping path pins as the home board. Do not fail Bob for this id.
