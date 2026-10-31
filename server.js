/* Bachar Game Lab — static portal + Halloween houses API */
const express = require('express');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const DATA_BUCKET = process.env.DATA_BUCKET || 'bachar-game-lab-data';
const HOUSES_OBJECT = 'halloween/houses.json';
const ADMIN_PASS = process.env.ADMIN_PASS || '2882';
const GEO_KEY = process.env.GEOCODING_API_KEY || '';
const DEFAULT_HOUSES = path.join(__dirname, 'games/halloween/houses.json');

const storage = new Storage();
const bucket = storage.bucket(DATA_BUCKET);

app.get('/health', (_req, res) => res.sendStatus(200));

/* ---------- Halloween houses ---------- */
app.get('/api/halloween/houses', async (_req, res) => {
  try {
    const [buf] = await bucket.file(HOUSES_OBJECT).download();
    res.type('application/json').send(buf);
  } catch (e) {
    // first run / bucket unavailable — serve the bundled default
    res.sendFile(DEFAULT_HOUSES);
  }
});

function requireAdmin(req, res, next) {
  if ((req.get('x-admin-pass') || '') !== ADMIN_PASS) {
    return res.status(401).json({ error: 'סיסמה שגויה' });
  }
  next();
}

app.get('/api/halloween/auth', requireAdmin, (_req, res) => res.json({ ok: true }));

app.put('/api/halloween/houses', requireAdmin, async (req, res) => {
  const houses = req.body;
  if (!Array.isArray(houses)) return res.status(400).json({ error: 'expected an array' });
  for (const h of houses) {
    if (!h.addr || typeof h.lat !== 'number' || typeof h.lng !== 'number' || !h.open || !h.close) {
      return res.status(400).json({ error: `בית "${h.addr || '?'}" חסר כתובת/מיקום/שעות` });
    }
  }
  try {
    await bucket.file(HOUSES_OBJECT).save(JSON.stringify(houses, null, 2), {
      contentType: 'application/json',
    });
    res.json({ ok: true, count: houses.length });
  } catch (e) {
    console.error('houses save failed:', e.message);
    res.status(502).json({ error: 'השמירה נכשלה — נסו שוב' });
  }
});

/* ---------- geocoding (Google, Nominatim fallback) ---------- */
app.get('/api/halloween/geocode', requireAdmin, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'missing q' });
  const query = /תל.?אביב/.test(q) ? q : q + ', תל אביב';

  try {
    if (GEO_KEY) {
      const url = 'https://maps.googleapis.com/maps/api/geocode/json' +
        `?address=${encodeURIComponent(query)}&key=${GEO_KEY}&language=he&region=il` +
        '&bounds=32.09,34.77%7C32.13,34.81';
      const r = await (await fetch(url)).json();
      if (r.status === 'OK' && r.results.length) {
        const g = r.results[0];
        return res.json({
          lat: g.geometry.location.lat,
          lng: g.geometry.location.lng,
          formatted: g.formatted_address,
          source: 'google',
        });
      }
      if (r.status !== 'ZERO_RESULTS') console.error('google geocode:', r.status, r.error_message);
    }
    // fallback: Nominatim
    const nu = 'https://nominatim.openstreetmap.org/search?format=json&limit=1' +
      `&q=${encodeURIComponent(query)}`;
    const nr = await (await fetch(nu, { headers: { 'User-Agent': 'bachar-game-lab/1.0' } })).json();
    if (nr.length) {
      return res.json({ lat: +nr[0].lat, lng: +nr[0].lon, formatted: nr[0].display_name, source: 'osm' });
    }
    res.status(404).json({ error: 'הכתובת לא נמצאה — נסו לנסח אחרת או גררו את הסיכה ידנית' });
  } catch (e) {
    console.error('geocode failed:', e);
    res.status(502).json({ error: 'שירות המיקום לא זמין כרגע' });
  }
});

/* ---------- static portal ---------- */
app.use(express.static(__dirname, { extensions: ['html'], maxAge: '1h', index: 'index.html' }));

app.listen(PORT, () => console.log(`game lab listening on :${PORT}`));
