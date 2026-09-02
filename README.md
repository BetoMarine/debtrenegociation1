# 正確的門 · Right Door

A free Hong Kong consumer tool. Someone in financial difficulty prepares a hardship / Interbank Debt Relief Plan (IDRP) pack **on their phone** and **sends it themselves**.

This repository is the v1 proof of concept for the first 20 testers (job-loss / pre-default). It is not an App Store app, not a debt mill, and not a collector.

## Open on iPhone (no npm)

Public HTTPS production build (static files only; your letter and photos stay on the phone):

**https://betomarine.github.io/debtrenegociation1/**

1. Open that link in **Safari** (not the in-app GitHub browser if it blocks Add to Home Screen).
2. Share → Add to Home Screen.
3. After the first load it works offline. Completing a pack does not POST your name, HKID, amounts, or files.

If Safari says 404, GitHub Pages is not switched on yet. In the GitHub app or safari, open [github.com/BetoMarine/debtrenegociation1/settings/pages](https://github.com/BetoMarine/debtrenegociation1/settings/pages) → **Build and deployment** → **Source: Deploy from a branch** → **Branch: `gh-pages`** / **folder: `/ (root)`** → Save. Wait a minute and reload the URL.

The `gh-pages` branch is the `npm run build` output (`GITHUB_PAGES=true`). After merge to `main`, `.github/workflows/pages.yml` rebuilds that branch.

## Who this build is for

Banked Hong Kong borrowers **before write-off**, typically:

- the job ended
- hours or pay were cut
- they already know they cannot pay the next six months of instalments

Not in this build: FDH flows, police/NGO triage, passport cases, money-lender-only cases, Alipay, chatbots, accounts, payments, bank APIs.

## What it does

On iPhone Safari (add to Home Screen):

1. Traditional Chinese first, English toggle
2. One-screen promise: the account manager is the wrong door; prepare the letter here; you send it
3. Why you are here (one choice)
4. Creditors as nicknames + type (amounts optional)
5. Structured situation fields → first-person letter in your name, editable before PDF
6. Deterministic door (not a chatbot)
7. Document checklist; photos stay in local storage
8. Client-side PDF; share via the OS share sheet or download
9. Pack status you tap: draft / sent / waiting / accepted / rejected / gave up. After “sent”, a 7-day come-back card
10. Hidden on-device counters (tap the version number five times)

Nothing about identity, HKID, amounts, creditor names, photos, or PDFs is uploaded. There is no account, login, OTP, or Apple/Google sign-in.

## Product rules

- We never contact a bank, lender, the police, or an NGO. Every step is user-triggered, in their name.
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

Founder / testers with only an iPhone: open **https://betomarine.github.io/debtrenegociation1/** in Safari, then Share → Add to Home Screen.

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
src/app.js       screens and local state
src/door.js      deterministic door + verified URLs
src/letter.js    first-person letter from structured fields
src/pdf.js       client-side PDF (system CJK fonts via canvas)
src/db.js        IndexedDB only
src/events.js    enum event log
src/i18n.js      繁體中文 first, English toggle
```

Tap the version label five times for on-device counters.

## Out of scope

FDH flows, police/NGO triage, Alipay, chatbots, accounts, payments, bank APIs, SEO, cloud admin dashboards, App Store distribution.
