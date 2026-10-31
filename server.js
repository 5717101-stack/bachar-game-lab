/* Bachar Game Lab — static portal + Halloween houses API */
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT || 8080;
const DATA_BUCKET = process.env.DATA_BUCKET || 'bachar-game-lab-data';
const HOUSES_OBJECT = 'halloween/houses.json';
const ADMIN_PASS = process.env.ADMIN_PASS || '2882';
const GEO_KEY = process.env.GEOCODING_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const WA_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WA_TEMPLATE = process.env.WHATSAPP_TEMPLATE || 'halloween_host_update';
const DEFAULT_HOUSES = path.join(__dirname, 'games/halloween/houses.json');

const storage = new Storage();
const bucket = storage.bucket(DATA_BUCKET);

/* ---------- data helpers ---------- */
async function loadHouses() {
  try {
    const [buf] = await bucket.file(HOUSES_OBJECT).download();
    return JSON.parse(buf.toString());
  } catch (e) {
    return require(DEFAULT_HOUSES);
  }
}

async function saveHouses(houses) {
  await bucket.file(HOUSES_OBJECT).save(JSON.stringify(houses, null, 2), {
    contentType: 'application/json',
  });
}

const newToken = () => crypto.randomBytes(8).toString('hex');
function ensureTokens(houses) {
  for (const h of houses) {
    if (!h.id) h.id = 'h' + crypto.randomBytes(4).toString('hex');
    if (!h.token) h.token = newToken();
  }
  return houses;
}

const PRIVATE_FIELDS = ['phone', 'token'];
const publicView = houses => houses.map(h => {
  const c = { ...h };
  PRIVATE_FIELDS.forEach(f => delete c[f]);
  return c;
});

function isAdmin(req) { return (req.get('x-admin-pass') || '') === ADMIN_PASS; }
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'סיסמה שגויה' });
  next();
}

function validHouse(h) {
  return h.addr && typeof h.lat === 'number' && typeof h.lng === 'number' && h.open && h.close;
}

app.get('/health', (_req, res) => res.sendStatus(200));
app.get('/api/halloween/auth', requireAdmin, (_req, res) => res.json({ ok: true }));

/* ---------- houses ---------- */
app.get('/api/halloween/houses', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const houses = await loadHouses();
    res.json(isAdmin(req) ? houses : publicView(houses));
  } catch (e) {
    console.error('houses load failed:', e.message);
    res.status(502).json({ error: 'טעינת הבתים נכשלה' });
  }
});

app.put('/api/halloween/houses', requireAdmin, async (req, res) => {
  const houses = req.body;
  if (!Array.isArray(houses)) return res.status(400).json({ error: 'expected an array' });
  for (const h of houses) {
    if (!validHouse(h)) return res.status(400).json({ error: `בית "${h.addr || '?'}" חסר כתובת/מיקום/שעות` });
  }
  try {
    ensureTokens(houses);
    await saveHouses(houses);
    res.json({ ok: true, count: houses.length });
  } catch (e) {
    console.error('houses save failed:', e.message);
    res.status(502).json({ error: 'השמירה נכשלה — נסו שוב' });
  }
});

/* ---------- geocoding (Google, Nominatim fallback) ---------- */
async function geocodeAddr(q) {
  const query = /תל.?אביב/.test(q) ? q : q + ', תל אביב';
  if (GEO_KEY) {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json' +
      `?address=${encodeURIComponent(query)}&key=${GEO_KEY}&language=he&region=il` +
      '&bounds=32.09,34.77%7C32.13,34.81';
    const r = await (await fetch(url)).json();
    if (r.status === 'OK' && r.results.length) {
      const g = r.results[0];
      return { lat: g.geometry.location.lat, lng: g.geometry.location.lng, formatted: g.formatted_address, source: 'google' };
    }
    if (r.status !== 'ZERO_RESULTS') console.error('google geocode:', r.status, r.error_message);
  }
  const nu = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const nr = await (await fetch(nu, { headers: { 'User-Agent': 'bachar-game-lab/1.0' } })).json();
  if (nr.length) return { lat: +nr[0].lat, lng: +nr[0].lon, formatted: nr[0].display_name, source: 'osm' };
  return null;
}

app.get('/api/halloween/geocode', requireAdmin, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'missing q' });
  try {
    const g = await geocodeAddr(q);
    if (!g) return res.status(404).json({ error: 'הכתובת לא נמצאה — נסו לנסח אחרת או גררו את הסיכה ידנית' });
    res.json(g);
  } catch (e) {
    console.error('geocode failed:', e);
    res.status(502).json({ error: 'שירות המיקום לא זמין כרגע' });
  }
});

/* ---------- Excel import (Gemini extraction, returns a PREVIEW — not saved) ---------- */
const IMPORT_PROMPT = `אתה מחלץ נתונים מגיליון של בתים שמארחים ילדים בערב ליל כל הקדושים בשכונה.
קיבלת את תוכן הגיליון כ-CSV. החזר אך ורק JSON בפורמט המבוקש.

חוקים קריטיים — דיוק מעל הכל:
1. העתק ערכים אות-באות ותו-בתו מהגיליון. לעולם אל תמציא, אל תשלים ואל "תתקן" נתונים.
2. קודי כניסה (code) ומספרי טלפון (phone) חייבים להיות העתק מדויק לחלוטין, כולל סולמיות, כוכביות ומקפים. טעות בקוד = ילדים שלא מצליחים להיכנס לבניין.
3. אם שדה לא קיים בגיליון או שאתה לא בטוח בו — החזר מחרוזת ריקה. אסור לנחש.
4. שעות: החזר בפורמט HH:MM (24 שעות). טווח כמו "17:30-20:30" פירושו open="17:30", close="20:30".
5. addr = רחוב + מספר בית + אות כניסה אם צוינה (למשל "יהודה עמיחי 14ב"). פרטים כמו קומה, דירה, קוד, "בלובי", "בגינה" אינם חלק מהכתובת — שים אותם בשדות floor / apt / code / note בהתאמה.
6. note = כל פרט עזר שאינו נכנס לשדות האחרים (בלובי, בגינה, בניין A, לפני השומר...).
7. phone = מספר טלפון של המארח אם קיים בגיליון, בדיוק כפי שכתוב.
8. אל תדלג על אף שורה שמכילה בית מארח, ואל תוסיף שורות שלא קיימות.
9. שורת כותרת או שורות ריקות — התעלם מהן.

החזר מערך JSON שבו כל איבר: {"host","addr","phone","floor","apt","code","note","open","close"}`;

app.post('/api/halloween/import', requireAdmin, async (req, res) => {
  const { data_b64, filename } = req.body || {};
  if (!data_b64) return res.status(400).json({ error: 'missing file' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  try {
    const wb = XLSX.read(Buffer.from(data_b64, 'base64'), { type: 'buffer' });
    let csv = '';
    for (const name of wb.SheetNames) {
      const c = XLSX.utils.sheet_to_csv(wb.Sheets[name]).trim();
      if (c) csv += `--- גיליון: ${name} ---\n${c}\n`;
    }
    if (!csv.trim()) return res.status(400).json({ error: 'הקובץ ריק או לא נקרא' });
    if (csv.length > 100000) csv = csv.slice(0, 100000);

    const gr = await (await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: IMPORT_PROMPT + '\n\nקובץ: ' + (filename || '') + '\n\n' + csv }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  host: { type: 'STRING' }, addr: { type: 'STRING' }, phone: { type: 'STRING' },
                  floor: { type: 'STRING' }, apt: { type: 'STRING' }, code: { type: 'STRING' },
                  note: { type: 'STRING' }, open: { type: 'STRING' }, close: { type: 'STRING' },
                },
                required: ['addr', 'open', 'close'],
              },
            },
          },
        }),
      }
    )).json();
    const text = gr.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('gemini import failed:', JSON.stringify(gr).slice(0, 500));
      return res.status(502).json({ error: 'המודל לא הצליח לקרוא את הקובץ' });
    }
    let parsed = JSON.parse(text).filter(h => h.addr && h.open && h.close);

    // geocode + keep tokens of existing matching houses (so sent links keep working)
    const existing = await loadHouses();
    const warnings = [];
    for (const h of parsed) {
      const match = existing.find(e =>
        (h.phone && e.phone && e.phone.replace(/\D/g, '') === h.phone.replace(/\D/g, '')) ||
        (e.addr === h.addr && (e.host || '') === (h.host || '')));
      if (match) { h.id = match.id; h.token = match.token; }
      try {
        const g = await geocodeAddr(h.addr);
        if (g) { h.lat = g.lat; h.lng = g.lng; h.geo = g.source; }
        else if (match) { h.lat = match.lat; h.lng = match.lng; h.geo = 'prev'; warnings.push(`"${h.addr}" — לא אותר, נשמר המיקום הקודם`); }
        else { h.lat = 32.1082; h.lng = 34.7888; h.geo = 'center'; warnings.push(`"${h.addr}" — לא אותר! הוצב במרכז השכונה, גררו ידנית`); }
      } catch (e) {
        h.lat = match ? match.lat : 32.1082; h.lng = match ? match.lng : 34.7888; h.geo = 'err';
        warnings.push(`"${h.addr}" — שגיאת איתור`);
      }
    }
    ensureTokens(parsed);
    res.json({ houses: parsed, warnings, count: parsed.length });
  } catch (e) {
    console.error('import failed:', e);
    res.status(502).json({ error: 'הייבוא נכשל: ' + e.message });
  }
});

/* ---------- host self-edit (token = auth) ---------- */
const HOST_EDITABLE = ['host', 'addr', 'phone', 'floor', 'apt', 'code', 'note', 'open', 'close', 'lat', 'lng'];

app.get('/api/halloween/host/:token', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const houses = await loadHouses();
  const h = houses.find(x => x.token === req.params.token);
  if (!h) return res.status(404).json({ error: 'קישור לא תקין' });
  res.json(h);
});

app.put('/api/halloween/host/:token', async (req, res) => {
  try {
    const houses = await loadHouses();
    const h = houses.find(x => x.token === req.params.token);
    if (!h) return res.status(404).json({ error: 'קישור לא תקין' });
    const b = req.body || {};
    const addrChanged = b.addr && b.addr !== h.addr;
    const pinMoved = typeof b.lat === 'number' && typeof b.lng === 'number' &&
      (Math.abs(b.lat - h.lat) > 1e-7 || Math.abs(b.lng - h.lng) > 1e-7);
    for (const f of HOST_EDITABLE) if (f in b) h[f] = b[f];
    if (addrChanged && !pinMoved) {
      const g = await geocodeAddr(h.addr).catch(() => null);
      if (g) { h.lat = g.lat; h.lng = g.lng; }
    }
    if (!validHouse(h)) return res.status(400).json({ error: 'חסרים כתובת או שעות' });
    h.confirmed = new Date().toISOString();
    await saveHouses(houses);
    res.json({ ok: true, house: h });
  } catch (e) {
    console.error('host save failed:', e);
    res.status(502).json({ error: 'השמירה נכשלה — נסו שוב' });
  }
});

/* ---------- WhatsApp notify (admin) ---------- */
function toWaNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '972' + d.slice(1);
  return d.length >= 11 && d.startsWith('972') ? d : null;
}

app.post('/api/halloween/notify', requireAdmin, async (req, res) => {
  if (!WA_TOKEN || !WA_PHONE_ID) return res.status(500).json({ error: 'WhatsApp not configured' });
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'missing ids' });
  const houses = await loadHouses();
  const results = [];
  for (const id of ids) {
    const h = houses.find(x => x.id === id);
    if (!h) { results.push({ id, ok: false, error: 'לא נמצא' }); continue; }
    const to = toWaNumber(h.phone);
    if (!to) { results.push({ id, addr: h.addr, ok: false, error: 'אין טלפון תקין' }); continue; }
    try {
      const r = await (await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: WA_TEMPLATE,
            language: { code: 'he' },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: h.host || 'שכנים יקרים' }] },
              { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: h.token }] },
            ],
          },
        }),
      })).json();
      if (r.messages?.length) results.push({ id, addr: h.addr, ok: true });
      else results.push({ id, addr: h.addr, ok: false, error: r.error?.message || 'שליחה נכשלה' });
    } catch (e) {
      results.push({ id, addr: h.addr, ok: false, error: e.message });
    }
  }
  res.json({ results, sent: results.filter(r => r.ok).length });
});

/* ---------- static portal ---------- */
app.use(express.static(__dirname, { extensions: ['html'], maxAge: '1h', index: 'index.html' }));

app.listen(PORT, () => console.log(`game lab listening on :${PORT}`));
