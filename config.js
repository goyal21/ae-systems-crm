// ═══════════════════════════════════════════════════════════
//  AE SYSTEMS CRM — CONFIGURATION
//  Fill in your Google Cloud credentials below.
//  See SETUP.md for step-by-step instructions.
// ═══════════════════════════════════════════════════════════

const AE_CONFIG = {

  // ── GOOGLE OAUTH (from Google Cloud Console) ──
  GOOGLE_CLIENT_ID: '596054794973-8lq3a4h6qtgo46prn74ffob66m2cs6c4.apps.googleusercontent.com',

  // ── GOOGLE SHEETS ──
  SHEET_ID: '1bq8F0CuKitFf5_vE08ogz5uYyPqDTYIduVTUAJYuOPI',
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1bq8F0CuKitFf5_vE08ogz5uYyPqDTYIduVTUAJYuOPI/edit',
  SHEET_NAME: 'Leads',

  // ── GOOGLE API KEY ──
  API_KEY: 'AIzaSyA1oMXHrSiZxlZWWr1na3OYTraH_8vTi9s',

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
    { name: 'Amit Srivastava', email: 'srvamitsrv@gmail.com' },
    { name: 'Abhishek Wadhawan',     email: 'abhishek.work1904@gmail.com' },
    { name: 'Amit Goyal',            email: 'goyal.21@gmail.com' },
    { name: 'Pawan Sharma',          email: 'tejalsharmapk@gmail.com' },
    { name: 'Mahir Sharma',          email: 'msmahirsharma0@gmail.com' },
  ],

  APP_NAME:    'AE Systems CRM',
  APP_TAGLINE: 'Make Everything Better',
};
