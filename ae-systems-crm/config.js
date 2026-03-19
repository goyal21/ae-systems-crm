// ═══════════════════════════════════════════════════════════
//  AE SYSTEMS CRM — CONFIGURATION
//  Fill in your Google Cloud credentials below.
//  See SETUP.md for step-by-step instructions.
// ═══════════════════════════════════════════════════════════

const AE_CONFIG = {

  // ── GOOGLE OAUTH (from Google Cloud Console) ──
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  // ── GOOGLE SHEETS ──
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
  SHEET_NAME: 'Leads',

  // ── GOOGLE API KEY ──
  API_KEY: 'YOUR_GOOGLE_API_KEY',

  // ── ALLOWED USERS — only these Gmail addresses can log in ──
  ALLOWED_USERS: [
    'srvamitsrv@gmail.com',
    'abhishek.work1904@gmail.com',
    'goyal.21@gmail.com',
    'tejalsharmapk@gmail.com',
    'msmahirsharma0@gmail.com',
  ],

  // ── FOUNDERS (for lead assignment) ──
  FOUNDERS: [
    { name: 'Amit Kumar Srivastava', email: 'srvamitsrv@gmail.com' },
    { name: 'Abhishek Wadhawan',     email: 'abhishek.work1904@gmail.com' },
    { name: 'Amit Goyal',            email: 'goyal.21@gmail.com' },
    { name: 'Pawan Sharma',          email: 'tejalsharmapk@gmail.com' },
    { name: 'Mahir Sharma',          email: 'msmahirsharma0@gmail.com' },
  ],

  APP_NAME:    'AE Systems CRM',
  APP_TAGLINE: 'Make Everything Better',
};
