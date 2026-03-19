// ═══════════════════════════════════════════════
//  AE SYSTEMS CRM — GOOGLE SHEETS MODULE
// ═══════════════════════════════════════════════

const Sheets = (() => {
  // Column order in the Google Sheet
  const COLUMNS = [
    'id', 'contact', 'company', 'phone', 'email',
    'type', 'stage', 'priority', 'value', 'source',
    'city', 'assignedTo', 'notes', 'createdAt', 'updatedAt', 'createdBy'
  ];

  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

  function getToken() {
    // Get OAuth token from Google Identity Services
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google OAuth not loaded'));
        return;
      }
      const client = google.accounts.oauth2.initTokenClient({
        client_id: AE_CONFIG.GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (resp) => {
          if (resp.error) reject(resp);
          else resolve(resp.access_token);
        },
      });
      client.requestAccessToken({ prompt: '' });
    });
  }

  async function ensureHeaders() {
    // Check if header row exists, create if not
    try {
      const url = `${BASE}/${AE_CONFIG.SHEET_ID}/values/${AE_CONFIG.SHEET_NAME}!A1:P1?key=${AE_CONFIG.API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.values && data.values[0]?.length >= COLUMNS.length) return;

      // Write headers
      const token = await getToken();
      await fetch(
        `${BASE}/${AE_CONFIG.SHEET_ID}/values/${AE_CONFIG.SHEET_NAME}!A1:P1?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [COLUMNS] }),
        }
      );
    } catch(e) { console.warn('ensureHeaders:', e); }
  }

  async function readAll() {
    try {
      const url = `${BASE}/${AE_CONFIG.SHEET_ID}/values/${AE_CONFIG.SHEET_NAME}?key=${AE_CONFIG.API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.values || data.values.length < 2) return [];

      const [headers, ...rows] = data.values;
      return rows.map(row => {
        const obj = {};
        COLUMNS.forEach((col, i) => { obj[col] = row[i] || ''; });
        return obj;
      }).filter(r => r.id); // skip empty rows
    } catch(e) {
      console.error('Sheets readAll:', e);
      return [];
    }
  }

  async function appendRow(lead) {
    try {
      const token = await getToken();
      const row = COLUMNS.map(c => lead[c] || '');
      const res = await fetch(
        `${BASE}/${AE_CONFIG.SHEET_ID}/values/${AE_CONFIG.SHEET_NAME}!A:P:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [row] }),
        }
      );
      return res.ok;
    } catch(e) { console.error('appendRow:', e); return false; }
  }

  async function updateRow(lead) {
    // Find row index by id, then update
    try {
      const url = `${BASE}/${AE_CONFIG.SHEET_ID}/values/${AE_CONFIG.SHEET_NAME}?key=${AE_CONFIG.API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.values) return false;

      const rowIndex = data.values.findIndex(r => r[0] === lead.id);
      if (rowIndex < 0) return false;

      const token = await getToken();
      const sheetRow = rowIndex + 1; // 1-indexed
      const row = COLUMNS.map(c => lead[c] || '');
      const updateRes = await fetch(
        `${BASE}/${AE_CONFIG.SHEET_ID}/values/${AE_CONFIG.SHEET_NAME}!A${sheetRow}:P${sheetRow}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [row] }),
        }
      );
      return updateRes.ok;
    } catch(e) { console.error('updateRow:', e); return false; }
  }

  async function deleteRow(id) {
    try {
      const url = `${BASE}/${AE_CONFIG.SHEET_ID}/values/${AE_CONFIG.SHEET_NAME}?key=${AE_CONFIG.API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.values) return false;

      const rowIndex = data.values.findIndex(r => r[0] === id);
      if (rowIndex < 0) return false;

      // Get sheetId (gid)
      const metaRes = await fetch(`${BASE}/${AE_CONFIG.SHEET_ID}?key=${AE_CONFIG.API_KEY}`);
      const meta = await metaRes.json();
      const sheet = meta.sheets?.find(s => s.properties.title === AE_CONFIG.SHEET_NAME);
      if (!sheet) return false;

      const token = await getToken();
      const deleteRes = await fetch(
        `${BASE}/${AE_CONFIG.SHEET_ID}:batchUpdate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                }
              }
            }]
          }),
        }
      );
      return deleteRes.ok;
    } catch(e) { console.error('deleteRow:', e); return false; }
  }

  return { ensureHeaders, readAll, appendRow, updateRow, deleteRow, COLUMNS };
})();
