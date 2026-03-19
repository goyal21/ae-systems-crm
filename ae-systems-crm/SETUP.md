# AE Systems CRM — Setup Guide
Complete setup in ~20 minutes. No coding required.

---

## What You're Setting Up

| Component | Purpose | Cost |
|-----------|---------|------|
| GitHub Pages | Hosts the app online | Free |
| Google OAuth | Secure login for 5 founders | Free |
| Google Sheets | Live database (exportable to Excel) | Free |
| Google Cloud API | Connects app to Sheets | Free |

---

## STEP 1 — Upload to GitHub

1. Go to github.com and sign in
2. Click New repository → name it: ae-systems-crm → Private → Create
3. Upload all files maintaining this structure:
   ae-systems-crm/
   ├── index.html
   ├── config.js
   ├── css/style.css
   └── js/auth.js, sheets.js, app.js
4. Go to Settings → Pages → Deploy from branch: main / root
5. Your app URL: https://YOUR-USERNAME.github.io/ae-systems-crm/

---

## STEP 2 — Google Cloud Project

1. Go to console.cloud.google.com
2. New Project → Name: AE Systems CRM → Create

---

## STEP 3 — Enable APIs

1. APIs & Services → Library
2. Enable: Google Sheets API
3. Enable: Google Drive API

---

## STEP 4 — OAuth Credentials (Login)

1. APIs & Services → Credentials → Create Credentials → OAuth client ID
2. Configure consent screen first (if prompted):
   - External, App name: AE Systems CRM
   - Add all 5 Gmail addresses as Test Users:
     srvamitsrv@gmail.com
     abhishek.work1904@gmail.com
     goyal.21@gmail.com
     tejalsharmapk@gmail.com
     msmahirsharma0@gmail.com
3. Create OAuth client ID:
   - Type: Web application
   - Authorised origins: https://YOUR-USERNAME.github.io
   - Copy the Client ID

---

## STEP 5 — API Key (for Sheets)

1. Create Credentials → API key
2. Restrict to: Google Sheets API + Google Drive API
3. Copy the API key

---

## STEP 6 — Google Sheet (Database)

1. Create new spreadsheet at sheets.google.com
2. Name it: AE Systems CRM Leads
3. Rename tab to: Leads
4. Copy Sheet ID from URL: .../spreadsheets/d/SHEET_ID/edit
5. Share sheet (Edit access) with all 5 Gmail accounts

---

## STEP 7 — Update config.js

Replace the 3 placeholder values:
  GOOGLE_CLIENT_ID: 'paste client id here'
  SHEET_ID: 'paste sheet id here'
  API_KEY: 'paste api key here'

Push updated config.js to GitHub.

---

## STEP 8 — Test

1. Open your GitHub Pages URL
2. Sign in with Google (any of the 5 accounts)
3. Add a test lead — verify it appears in Google Sheets

---

## Troubleshooting

"Access denied" → Gmail not in ALLOWED_USERS or OAuth test users
Blank screen → Check browser console (F12) for errors
Can't save → Sheet not shared with edit access
"App not verified" → Click Advanced → Go to app (safe for internal tools)

---

## Data Structure in Google Sheet

Columns: id | contact | company | phone | email | type | stage | priority |
         value | source | city | assignedTo | notes | createdAt | updatedAt | createdBy

You can download as Excel anytime via File → Download → .xlsx
