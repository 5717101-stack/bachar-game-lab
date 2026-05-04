# AGENTS.md — Bachar Game Lab

Extends `~/Projects/Bachar_Israeli_Lab/Itzik_Lab/AGENTS.md` (Lab brief).

Canonical brief: **[`PRODUCT_STATE.md`](./PRODUCT_STATE.md)**.

A static PWA (HTML/JS) — no build system other than Docker → nginx → Cloud Run.

---

## Build / Test / Run

| Task | Command |
|------|---------|
| Local dev | `python3 -m http.server 8080` from repo root (so `fetch('games.json')` works); or `docker build` + `docker run -p 8080:8080 .` |
| Build | `docker build -t bachar-game-lab .` |
| Tests | none |
| Deploy | `cloudbuild.yaml` — docker build → push → `gcloud run deploy bachar-game-lab` (`europe-west1`) |

---

## Project structure

```
index.html          RTL landing page; loads games.json + registers sw.js
games.json          Catalog of game ids, labels, colors, blurbs
games/<id>/         One subfolder per game (each is plain HTML/JS/CSS)
sw.js               Cache-first/shell precache + runtime caching of GET requests
manifest.json       PWA manifest
icons/              SVG icons (note: PWA `manifest.json` references PNGs — see risks)
Dockerfile          Copies static assets into nginx:alpine
nginx.conf          Static on :8080 + /health 200
cloudbuild.yaml
```

---

## Code rules

- **No build pipeline.** New games go under `games/<id>/` and an entry is
  added to `games.json`. The landing page renders the grid from JSON.
- **Service worker (`sw.js`) is hand-maintained.** Bumping cache version is
  the only way to force PWA refresh.
- **Hebrew RTL** — match the existing landing's `dir`, font (Rubik), and
  bidi handling.
- **Health check** — nginx serves `/health` returning 200; required by
  Cloud Run readiness.

## Restrictions

- Don't introduce a build step (Vite, webpack, etc.) — the project is
  intentionally zero-build.
- Don't reference external scripts beyond Google Fonts without considering
  PWA offline behaviour.
- Don't add a backend / form-post — this site is purely client-side.

## Require approval before

- Switching off the PWA model (sw.js + manifest).
- Embedding analytics that send PII.

---

## Subagents

No per-product PM yet. Route through the Lab's generic Product Manager
(`.lab/agents/product-manager.md`) with `Project: bachar_game_lab`.
