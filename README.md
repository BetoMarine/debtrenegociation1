# 正確的門 · Right Door · Sunday Pack · Fortune Teller

Three **separate** free Hong Kong consumer tools from Plan Your Life (PoC v0.6.0). Each has its own URL, Safari Add-to-Home-Screen title, and manifest. There is **no shared chooser**.

1. **Right Door** — a banked borrower prepares a hardship / Interbank Debt Relief Plan (IDRP) pack **on their phone** and **sends it themselves**.
2. **Sunday Pack** — a foreign domestic worker screens red flags, lists debts in bands, and splits remittance into a **1-page counsellor briefing** she creates and shares herself.
3. **Fortune Teller** — fix the break → build the foundation → then living goals vs a security net. An **owned Monte Carlo** engine runs in the browser. Not a retirement gadget. Envizage is out.

They are not App Store apps, not a debt mill, and not a collector. Neither hardship app **emails Enrich, NGOs, banks, or lenders**. Routing is a suggestion plus a tap-to-open link. Fortune Teller does not sell a fund or execute a trade.

Stores stay separate: Right Door uses the `pack` vault; Sunday Pack uses `sundayPack`; Fortune Teller uses `fortunePlan` / `fortuneForecast`.

## Public URLs (GitHub Pages)

| Product | URL | Home-screen title |
| --- | --- | --- |
| **Right Door** (root — existing links keep working) | https://betomarine.github.io/debtrenegociation1/ | 正確的門 |
| **Sunday Pack** | https://betomarine.github.io/debtrenegociation1/sunday/ | Sunday Pack |
| **Fortune Teller** (stable path — do not rename) | https://betomarine.github.io/debtrenegociation1/fortune/ | Fortune Teller |
| **Plan Your Life preview** (three equal Live cards) | https://betomarine.github.io/debtrenegociation1/pyl/ | — |

Open each URL in **Safari**. Share → Add to Home Screen. You get three icons. The Fortune Teller URL is `/fortune/` (not `/fortune-teller/`). Keep it stable.

A small footer link (“Other tools from Plan Your Life”) is optional. It is not a chooser.

This repo’s workflow publishes `npm run build` to the `gh-pages` branch on each push to `main`. Completing a pack still does not POST names, HKID, amounts, or files — hosting is JS/CSS only.

If the public URL is 404, turn on Pages once (Safari, not the GitHub app):

1. Open [github.com/BetoMarine/debtrenegociation1/settings/pages](https://github.com/BetoMarine/debtrenegociation1/settings/pages).
2. **Build and deployment** → **Source** → **Deploy from a branch**.
3. **Branch:** `gh-pages` · **Folder:** `/ (root)`.
4. **Save**. Wait about one minute.

## Who this build is for

**Right Door** — banked Hong Kong borrowers **before write-off**, typically:

- the job ended
- hours or pay were cut
- they already know they cannot pay the next six months of instalments

**Sunday Pack** — foreign domestic workers in Hong Kong who want to prepare for a counsellor (Enrich by default, HELP / Labour / consulate if the red-flag screen says so).

**Fortune Teller** — people in Hong Kong who should not skip straight to goals. The hero path is **I need to rebuild**: fix debt heat, put meat on the bone, then modest living goals vs a security net. Not “years to retirement” as the hero.

Not in this build: money-lender-only bank packs, Alipay, chatbots, accounts, payments, bank APIs, cloud document vaults for Sunday Pack, Envizage, Finnhub live marks, custody/trading.

## What it does

Each URL opens that product’s privacy / start screen. No first-page chooser.

### Right Door

On iPhone Safari (add to Home Screen):

1. Traditional Chinese first, English toggle
2. One-screen promise: the account manager is the wrong door; prepare the letter here; you send it. A callout states that the pack, photos, HKID, and amounts stay on this phone, and that we do not upload, store, or collect data.
3. Why you are here (one choice)
4. Creditors as nicknames + type (amounts optional)
5. Structured situation fields → first-person letter in your name, editable before PDF
6. Deterministic door (not a chatbot)
7. Document checklist: hardship proof (≥1 photo) and last-three-months bank statements (3 photos). HKID/other optional. Photos stay in local storage. PDF/Share stay blocked until the required files are on the phone.
8. Client-side PDF of the structured letter plus image annexes; share via the OS share sheet or download
9. Pack status you tap: draft / sent / waiting / accepted / rejected / gave up. After “sent”, a 7-day come-back card
10. Hidden on-device counters (tap the version number five times)

Nothing about identity, HKID, amounts, creditor names, photos, or PDFs is uploaded, stored, or collected. There is no account, login, OTP, or Apple/Google sign-in. Uninstall wipes it.

### Sunday Pack

Stored in a **separate IndexedDB key** from the Right Door vault (no photo annexes in v0).

1. Privacy: stays on this phone until she shares; checkbox that the app does not talk to Enrich / banks / lenders for her
2. Language: Tagalog / Bahasa Indonesia / English
3. Red-flag triage **before** inventory (passport/coercion → 999 + consulate + HELP; loan shark → HELP; illegal agency fee → Labour FDH + consulate; none → continue to Enrich)
4. Situation: nationality, months left on contract (optional), who knows about the debt, meeting goal
5. Debt inventory: nickname, type, HKD bands, guarantor, still borrowing
6. Remittance split: three percentages that sum to 100% (discussion aid only)
7. Door suggestion + Enrich booking deep link (we do not submit the form)
8. 1-page counsellor PDF, generated on the phone
9. Done: open booking / bring the PDF; clear this pack

### Fortune Teller

Stored in **separate IndexedDB keys** (`fortunePlan`, `fortuneForecast`, `fortuneUi`). **Hero PoC story:** do not assume people start healthy.

1. Privacy / promise, plus an on-start tip: **fix the fire → build the foundation → then living goals and mixes**
2. Life theme. **“I need to rebuild” is first / primary.** It does **not** dump a peak-career house on the board. Other themes stay available.
3. Debt-heat triage: none / paying / heavy or missing payments / FDW stress. Heavy → “Fix the fire first” with soft links to Right Door (`../`) and Sunday Pack (`../sunday/`). FDW prefers Sunday Pack. You can still tap “I've stabilized, continue.”
4. **Phase 1 Stabilize (default before the board):** emergency months (3 / 6) and/or HKD floor, money-now bands, surplus ≈ income − spend − debt service, a reach-month for the fund, meat-on-the-bone ticks at 1 / 3 / 6 months. Primary **Start real planning (Phase 2)** stays disabled until the floor holds. Secondary: thin-floor override with a warning.
5. **Phase 2:** rebuild seeds a *modest* living pack (phone / course / small visit) plus a strong net — not a HK$1.5M house fantasy. Then Living % / Net % dials, drag-the-timeline, templates, Rebuild coach
6. Portfolio templates (benchmarks, not products): Steady / Balanced / Growth / Frontier — assumed μ/σ + “illustrative, not a fund we sell”
7. Drag a milestone earlier/later → Monte Carlo re-runs → dials update
8. Save-vs-borrow compare for one milestone
9. One-page implementation sheet (PDF): plan summary + execute elsewhere with a licensed intermediary + not advice + not affiliated with HSBC
10. Export JSON / clear this plan. Soft dismissible login tease only (no real auth)

Client-side Monte Carlo: monthly steps, ~1000 paths, seeded. Goal success = funded by the target date on that path. Living dial = share of living milestones succeeding. Net dial = security-net success. A later `POST /simulate` can replace `src/fortune/simulate.js` without changing the UI.

**Absurd-input kill-test:** 0 income, 0 savings, a HK$15M+ house must hard-fail (dials wrecked, no green “you're set”). Covered by `src/fortune/engine.test.js`. A **Rebuild coach** under the dials stays on the board: honest “does not hold — yet,” what’s breaking, and one-tap delay / cut / money-band next steps so it is never a dead end.

Fortune Teller PDF footer:

> Plan Your Life / Fortune Teller · illustrative model · not regulated advice · not a product sale

> Execute this plan elsewhere with a licensed intermediary. Fortune Teller does not hold money, sell funds, or give regulated advice. Not affiliated with HSBC.

Crisis screens (Sunday Pack) use `tel:` and `https://wa.me/` only. A short pack can still be saved.

Sunday Pack PDF footer:

> Prepared by the helper on her device · Plan Your Life / Right Door (Sunday Pack) · not affiliated with Enrich

Plus: self-declared, not a credit report, not legal advice, not a request for Enrich to contact any lender.

## Product rules

- We never contact a bank, lender, Enrich, the police, or an NGO. Every step is user-triggered, in their name. Sunday Pack never emails Enrich for the helper.
- Copy must never say “hidden department,” “secret channel,” “we know the bank,” or lean on legal jargon. The published door is IDRP or the bank’s own hardship / workout unit.
- Free. No backend. No Typeform, Google Forms, Firebase Auth, or analytics SDKs that siphon form fields.
- Documents and the pack live only in IndexedDB. Uninstall wipes data. The UI says so.
- Do not upload packs. Do not send document contents or free-text financial stories to any LLM or API. Assessment is a deterministic script.
- On-device event log only (event name + timestamp + optional short enum). No AWS/hosting in this PoC.
- Credit-score honesty: restructuring is usually reported to credit agencies. The win is avoiding a 60-day default / bankruptcy / write-off, not a clean score.

## Door logic (deterministic)

| Situation | Door |
| --- | --- |
| Two or more creditors | Interbank Debt Relief Plan. Contact **one** creditor directly, not an intermediary. |
| HSBC unsecured only | HSBC’s published Debt Workout Unit / Collection Services path |
| Citi only | CitiPhone + a script asking for restructuring / hardship / IDRP, not a consolidation loan. No invented Citi workout unit. |
| Anyone else | Call the number on the statement; ask for hardship / IDRP, not the branch RM |

## Sunday Pack door logic (deterministic)

| Red flag | Door |
| --- | --- |
| Passport / contract held against will | HELP + 999 + consulate |
| Loan shark / collector threats | HELP (999 if danger); Enrich secondary |
| Illegal agency placement / training fee | Labour FDH hotline + consulate |
| None of the above | Enrich Financial Consultation |

Always listed as alternates: Caritas 18288, TWGH FDCC 2548 0803.

### Sunday Pack sources actually opened

- Enrich booking: [NeonCRM FHD registration](https://enrichhk.app.neoncrm.com/forms/fhd-registration)
- Enrich WhatsApp EN/Tagalog +852 5981 3754 · Bahasa +852 5648 0990 — [contact](https://enrichhk.org/contact-enrich) / [resources](https://enrichhk.org/resources-domestic-workers)
- HELP for Domestic Workers WhatsApp +852 5936 3780 — [contact](https://helpfordomesticworkers.org/contact/)
- Labour Department FDH hotline 2157 9537 — [FDH contact](https://www.fdh.labour.gov.hk/en/contact_us.html)
- Philippine Consulate switchboard 2823 8500 / after-hours 9155 4023 — [PCG directory](https://hongkongpcg.dfa.gov.ph/directory)
- Indonesian Consulate +852 3651 0200 — [HELP resources](https://helpfordomesticworkers.org/get-help/useful-numbers-and-links/)
- Caritas 18288 · TWGH FDCC 2548 0803

### Sources actually opened for this PoC

- HKMA, Personal credit / addressing debt problems: [English](https://www.hkma.gov.hk/eng/smart-consumers/personal-credit/) · [中文](https://www.hkma.gov.hk/chi/smart-consumers/personal-credit/)
- HKMA, IDRP consumer guide: [English PDF](https://www.hkma.gov.hk/media/eng/doc/smart-consumers/Attachment_Consumer_Guide_(EN)_2020.pdf) · [中文 PDF](https://www.hkma.gov.hk/media/chi/doc/smart-consumers/Attachment_Consumer_Guide_(CH)_2020.pdf)
- HSBC HK Money worries (Debt Workout Unit; English page lists Collection Services at the same address): [English](https://www.hsbc.com.hk/help/money-worries/) · [中文](https://www.hsbc.com.hk/zh-hk/help/money-worries/) — phone +852 2269 2444 (Mon–Fri 9:00–17:30), `cruu@hsbc.com.hk`, mail HSBC Collection Services, 5/F, Tower 2 & 3, HSBC Centre, 1 Sham Mong Road, Kowloon
- CitiPhone Banking: [citibank.com.hk … phone-banking](https://www.citibank.com.hk/english/personal-banking/services/phone-banking/) — 2860 0333. No equivalent public hardship page was found.

## How to run locally

Needs Node 18+.

```bash
npm install
npm test
npm run dev
```

Then open the URLs Vite prints:

- Right Door: `http://localhost:5173/`
- Sunday Pack: `http://localhost:5173/sunday/`
- Fortune Teller: `http://localhost:5173/fortune/`

Production-like build (service worker, offline after first load). Asset paths are relative, so the same files work on GitHub Pages and on `vite preview`:

```bash
npm run build
npm run preview
```

- Right Door: `http://localhost:4173/`
- Sunday Pack: `http://localhost:4173/sunday/`
- Fortune Teller: `http://localhost:4173/fortune/`

There is no server of your data. Vite only serves static files.

## How to test on a phone

Founder / testers with only an iPhone: after Pages is on, open **each** URL in Safari, then Share → Add to Home Screen. Confirm three icons, three titles.

**Right Door:** https://betomarine.github.io/debtrenegociation1/ → privacy/start (正確的門). No chooser. Walk the bank hardship / IDRP letter flow.

**Sunday Pack:** https://betomarine.github.io/debtrenegociation1/sunday/ → privacy checkbox (Sunday Pack). No chooser.

**Fortune Teller:** https://betomarine.github.io/debtrenegociation1/fortune/ → Fortune Teller (PoC v0.6.0). No chooser.

**Full-story demo (iPhone Safari):**

1. Open `/fortune/`. Read the tip: fix the fire → foundation → goals. Tap **Start with “I need to rebuild”**.
2. Theme picker: **I need to rebuild** is first (tag: The full story). Tap it. You must **not** land on a peak-career house board.
3. Debt heat: pick **Heavy debt or missing payments**. Confirm Right Door (`../`) and Sunday Pack (`../sunday/`) links. Tap **I've stabilized — continue to the floor**.
4. Phase 1: set 3 or 6 months, money bands, watch the reach date (or the honest “floor is not moving” line if surplus is 0). Meat-on-the-bone ticks at 1 / 3 / 6.
5. Raise savings / surplus until **Start real planning (Phase 2)** enables — or use the thin-floor override (warning first).
6. Phase 2 board: modest goals (phone / course / visit), not a HK$1.5M house. Dials + Rebuild coach still apply. Kill-test (0 income, 0 savings, add a HK$15M house) still hard-fails; coach stays.

Other checks: drag a milestone; both dials move. Switch Steady → Frontier. Save-vs-borrow. PDF footer (not advice / not HSBC). Right Door and Sunday Pack URLs unchanged.

Sunday Pack happy path: tick privacy → language → none of the red flags → situation → add one loan → remittance 40/35/25 → Enrich card → create PDF → share or download. Confirm the footer says **not affiliated with Enrich**. Crisis path: tick passport held against will and confirm 999 / HELP / consulate buttons are `tel:` / WhatsApp, not a message sent by the app. Right Door at the root URL must still run its own bank pack (separate store). `/pyl/` must show three Live cards.

Local preview (needs Node):

1. Put the phone and the computer on the same Wi-Fi.
2. Run `npm run build && npm run preview -- --host`.
3. On **iPhone Safari** (not Chrome-in-app), open the printed Network URL plus the product path, e.g. `http://192.168.x.x:4173/`, `http://192.168.x.x:4173/sunday/`, and `http://192.168.x.x:4173/fortune/`.
4. Share → Add to Home Screen on each.
5. Open the home-screen icon. Turn on Airplane Mode after the first load and finish a pack. PDF share / download should still work.
6. In Safari Web Inspector → Network, completing a pack must not POST names, HKID, amounts, or files anywhere.

To wipe tester data: use the erase / clear control on that product’s home or done screen, or delete the home-screen icon / site data. Wiping one product does not clear the other two.

Old bookmarks that still use `#/sunday-privacy` (and other `sunday-*` hashes) on the **root** URL are redirected to `/sunday/`.

## Project layout

```
index.html              Right Door HTML + apple-mobile-web-app-title
sunday/index.html       Sunday Pack HTML + its own title / manifest
fortune/index.html      Fortune Teller HTML + its own title / manifest
src/app.js              Right Door screens only
src/sunday/             Sunday Pack app, copy, door, PDF, screens
src/fortune/            Fortune Teller app, owned Monte Carlo engine, PDF
src/door.js             Right Door deterministic door + verified URLs
src/letter.js           first-person letter from structured fields
src/pdf.js              Right Door client-side PDF (system CJK fonts via canvas)
src/db.js               IndexedDB (`pack` / `sundayPack` / `fortunePlan`)
src/events.js           enum event log
src/i18n.js             繁體中文 first, English toggle (Right Door)
src/paths.js            public URLs for the three products
pyl-preview/            Plan Your Life studio page (source)
public/pyl/             same page, published at /pyl/ on GitHub Pages
```

Tap the version label five times for on-device counters.

## Out of scope

Alipay, chatbots, accounts, payments, bank APIs, SEO, cloud admin dashboards, App Store distribution, Sunday Pack photo vaults, the app messaging Enrich or any lender, Envizage, Finnhub live marks, Fortune Teller custody/trading, Chinese copy for Fortune Teller (nice-to-have only).
