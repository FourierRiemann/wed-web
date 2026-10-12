/**
 * Klistra in i Google Sheets: Tillägg > Apps Script.
 * Driftsätt: Driftsätt > Ny driftsättning > Webbapp,
 *   Kör som: Jag, Vem har åtkomst: Alla.
 * Kopiera webbapp-URL:en till RSVP_ENDPOINT i script.js.
 */

const FIELDS = ['name', 'email', 'attending', 'guests', 'plusOne', 'dietary'];
const MAX_LEN = 500;
const ARRIVALS = ['2027-07-16', '2027-07-17'];
const DEPARTURES = ['2027-07-17', '2027-07-18'];

function doPost(e) {
  try {
    const p = e.parameter || {};

    // Honeypot: bots fyller i dolda fält
    if (p.website) return json({ ok: true });

    if (!p.name || !p.email || !['Ja', 'Nej'].includes(p.attending)) {
      return json({ ok: false, error: 'Saknade fält' });
    }

    let stay = ['', '', ''];
    if (p.attending === 'Ja') {
      if (!ARRIVALS.includes(p.arrival) || !DEPARTURES.includes(p.departure)) {
        return json({ ok: false, error: 'Ogiltiga datum' });
      }
      const nights = Math.round((Date.parse(p.departure) - Date.parse(p.arrival)) / 86400000);
      stay = [p.arrival, p.departure, nights];
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Tidpunkt', 'Namn', 'E-post', 'Kommer', 'Antal', 'Respektive', 'Specialkost', 'Ankomst', 'Avresa', 'Nätter']);
      }
      sheet.appendRow([new Date(), ...FIELDS.map(f => clean(p[f])), ...stay]);
    } finally {
      lock.releaseLock();
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: 'Serverfel' });
  }
}

// Förhindrar formel-injektion i kalkylarket och begränsar längd
function clean(value) {
  const s = String(value || '').trim().slice(0, MAX_LEN);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
