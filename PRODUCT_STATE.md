# Product State — Bachar Game Lab

A Hebrew family-facing portal that lists and launches small browser games
(Monopoly-style board, parkour, character designer, memory matching, snakes
& ladders) with optional offline caching via a service worker.

---

## Architecture

Static HTML/JS PWA → nginx alpine → Cloud Run.

```
index.html ── loads games.json ── renders cards
              registers sw.js for offline shell
              cards link into games/<id>/index.html
```

No backend. No build step.

---

## Stack

| Layer | Tech |
|-------|------|
| App | Vanilla HTML, CSS, JS |
| PWA | `manifest.json` + `sw.js` |
| Hosting | Cloud Run nginx alpine, port `8080`, `europe-west1` |
| Fonts | Google Fonts (Rubik) |

---

## Repo map

| Path | Purpose |
|------|---------|
| `index.html` | RTL landing — loads `games.json`, registers service worker |
| `games.json` | Catalog (id, label, color, blurb) used to render the grid |
| `games/<id>/` | One subfolder per game (plain HTML/JS/CSS) |
| `sw.js` | Cache-first shell precache + runtime caching |
| `manifest.json` | PWA manifest |
| `icons/` | SVG icons |
| `Dockerfile` | Copies nginx config + static assets into nginx:alpine |
| `nginx.conf` | Serves on `:8080`, `/health` returns 200 |
| `cloudbuild.yaml` | CI deploy |

---

## Content

Listed games (per `games.json`):

- NY-themed Monopoly variant
- Canvas parkour game
- Character designer
- Animal memory matching
- Snakes & ladders

Each game lives entirely under `games/<id>/`.

---

## External integrations

- Google Fonts (Rubik)

---

## Critical files / invariants

- `index.html` + `games.json` — landing UX. New games need an entry here.
- `sw.js` — service worker; bumping cache version is the only way to force
  refresh on installed PWAs.
- `manifest.json` — PWA install metadata.
- `Dockerfile` + `nginx.conf` — static container, `/health` endpoint.

---

## Known risks / gotchas

- **Manifest references PNG icons** (`icon-192.png`, `icon-512.png`) but the
  repo listing shows SVGs in `icons/`. PWA install icons may 404 unless
  PNGs exist elsewhere — verify before assuming.
- **`index.html` references `/icons/icon-180.png`** for Apple touch icon —
  may also be missing.
