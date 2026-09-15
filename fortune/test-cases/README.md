# Fortune Teller test cases

Standing process: **cases live in this folder and must be runnable.** Do not keep Fortune QA only in chat, screenshots, or a spreadsheet.

## Who runs when

1. **Bob** runs first. That means `npm test` from the repo root (this catalog plus Fortune unit tests). Bob does not skip the catalog because Maddy will “see it on the phone.”
2. **Maddy** Safari QA starts only after Bob is green. Live LOOP / ENTRY still need **iPhone Safari** (not Chrome-in-app, not the GitHub app WebView).
3. Do **not** reopen the Linda Firm `/pyl/` DRAFT shelf as part of Fortune work.

## Run

```bash
npm test
```

Vitest picks up `fortune/test-cases/cases.test.js`. Automated ids (`FT-DATE-01`, `FT-EF-01`, `FT-FAIL-01`, `FT-DRAG-01`, `FT-OVERLAP-01`) execute real assertions. `FT-LOOP-01` / `FT-ENTRY-01` keep a unit slice where one exists; the live path is still Safari. `FT-DRAG-01` / `FT-OVERLAP-01` also want a Safari glance after Bob is green (Sooner/Later + overlap hint).

## Files

| File | Role |
| --- | --- |
| `cases.json` | Machine catalog (ids, status, automation, Safari flag) |
| `cases.md` | Human steps for Bob + Maddy |
| `cases.test.js` | Runnable catalog + automated assertions |

Add a new Fortune case here (json + md + test status) in the same change that ships the behavior. If it cannot be unit-tested yet, say `safari_manual` or `not_built` — do not omit the id.
