# 正確的門 · Right Door · Sunday Pack

A free Hong Kong consumer tool. Two on-device paths share one Safari page (PoC v0.2.0):

1. **Right Door** — a banked borrower prepares a hardship / Interbank Debt Relief Plan (IDRP) pack **on their phone** and **sends it themselves**.
2. **Sunday Pack** — a foreign domestic worker screens red flags, lists debts in bands, and splits remittance into a **1-page counsellor briefing** she creates and shares herself.

It is not an App Store app, not a debt mill, and not a collector. The app **never emails Enrich, NGOs, banks, or lenders**. Routing is a suggestion plus a tap-to-open link.

## Open on iPhone (no npm)

Public HTTPS URL (production Vite build, static files only):

**https://betomarine.github.io/debtrenegociation1/**

This agent pushed the `npm run build` output to the `gh-pages` branch and added `.github/workflows/pages.yml`. It **cannot** flip the Pages switch (GitHub API 403). Until you do that one tap, the URL is 404.

On iPhone, use **Safari** (the GitHub app often hides repo Settings):

1. Open [github.com/BetoMarine/debtrenegociation1/settings/pages](https://github.com/BetoMarine/debtrenegociation1/settings/pages) and sign in if asked.
2. **Build and deployment** → **Source** → **Deploy from a branch**.
3. **Branch:** `gh-pages` · **Folder:** `/ (root)`.
4. **Save**. Wait about one minute.
5. Open **https://betomarine.github.io/debtrenegociation1/** in Safari → Share → Add to Home Screen.

After merge to `main`, the workflow rebuilds `gh-pages` on each push. Completing a pack still does not POST names, HKID, amounts, or files — hosting is JS/CSS only.

## Who this build is for

Banked Hong Kong borrowers **before write-off**, typically:

- the job ended
- hours or pay were cut
- they already know they cannot pay the next six months of instalments

**Sunday Pack** is for foreign domestic workers in Hong Kong who want to prepare for a counsellor (Enrich by default, HELP / Labour / consulate if the red-flag screen says so).

Not in this build: money-lender-only bank packs, Alipay, chatbots, accounts, payments, bank APIs, cloud document vaults for Sunday Pack.

## What it does

Home is a **chooser**. Pick Right Door or Sunday Pack. Privacy framing is on both paths.

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

Crisis screens use `tel:` and `https://wa.me/` only. A short pack can still be saved.

PDF footer:

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

Then open the URL Vite prints (usually `http://localhost:5173`).

Production-like build (service worker, offline after first load):

```bash
npm run build
npm run preview
```

There is no server of your data. Vite only serves static files.

## How to test on a phone

Founder / testers with only an iPhone: after the Pages tap above, open **https://betomarine.github.io/debtrenegociation1/** in Safari, then Share → Add to Home Screen.

Sunday Pack happy path: chooser → Sunday Pack → tick privacy → language → none of the red flags → situation → add one loan → remittance 40/35/25 → Enrich card → create PDF → share or download. Confirm the footer says **not affiliated with Enrich**. Crisis path: tick passport held against will and confirm 999 / HELP / consulate buttons are `tel:` / WhatsApp, not a message sent by the app. Then open Right Door from the chooser and confirm the bank pack still runs.

Local preview (needs Node):

1. Put the phone and the computer on the same Wi-Fi.
2. Run `npm run build && npm run preview -- --host`.
3. On **iPhone Safari** (not Chrome-in-app), open the printed Network URL, e.g. `http://192.168.x.x:4173`.
4. Share → Add to Home Screen.
5. Open the home-screen icon. Turn on Airplane Mode after the first load and finish a pack. PDF share / download should still work.
6. In Safari Web Inspector → Network, completing a pack must not POST names, HKID, amounts, or files anywhere.

To wipe tester data: use “Erase everything on this phone” on the home screen, or delete the home-screen icon / site data.

## Project layout

```
src/app.js            chooser + Right Door screens
src/sunday/           Sunday Pack copy, door, PDF, screens
src/door.js           Right Door deterministic door + verified URLs
src/letter.js         first-person letter from structured fields
src/pdf.js            Right Door client-side PDF (system CJK fonts via canvas)
src/db.js             IndexedDB (`pack` vs `sundayPack` keys)
src/events.js         enum event log
src/i18n.js           繁體中文 first, English toggle (Right Door + chooser)
```

Tap the version label five times for on-device counters.

## Out of scope

Alipay, chatbots, accounts, payments, bank APIs, SEO, cloud admin dashboards, App Store distribution, Sunday Pack photo vaults, the app messaging Enrich or any lender.
