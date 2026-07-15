# OLED TV Dashboard

Self-hosted dashboard for OLED TVs — pure black background, white/gray text only,
subtle anti-burn-in motion. Zero npm dependencies (Node ≥ 18).

## Run

```sh
node server/index.js          # http://0.0.0.0:8080
PORT=80 node server/index.js  # serve on port 80 (needs privileges)
```

- **TV screen:** open `http://<server>/tv1` in the TV browser. Any `/<id>` URL
  creates that TV with its own persisted config (`data/tvs/<id>.json`).
- **Configurator:** `http://<server>/tv1/config` from any desktop. Every change
  live-syncs to the TV over SSE — no reload, ever.
- **Landing page:** `http://<server>/` lists all TVs and their connection state.

## TV keys

| Key | Action |
| --- | --- |
| `1`–`9` | Switch view (order set in the configurator) |
| `0` | Config screen (shows the configurator URL) |
| `C` | Toggle style cycle |
| `←` `→` | Previous / next view |
| any | First press also triggers fullscreen |

## Styles

Three visual styles, assignable per view, or cycled on a configurable timer
(8/15/30/60 s) through the enabled pool:

- **A · Meridian** — corner-anchored Swiss, huge numerals, slow diagonal drift
- **B · Centered** — Space Grotesk display + mono labels, breathing fade
- **C · Baseline** — bottom-anchored rising type, vertical drift

## Burn-in & screensaver protection

- Motion intensity (0–10) drives slow drift on every view plus a whole-frame
  pixel shift; secondary/tertiary text brightness caps are configurable.
- Screen Wake Lock API + a hidden playing video (canvas stream, falling back to
  `assets/blank.mp4`) keep the TV's own screensaver from kicking in.

## Plugins

A view = a directory under `server/plugins/<id>/`:

```
index.js    server module: defaultConfig, configSchema (renders on the config
            page automatically), getData(cfg, ctx), optional api() REST routes,
            optional init() for seeding
client.js   browser renderer: default export { id, render: { a, b, c } },
            returns HTML strings for each style
page.html   optional dedicated management page at /<tv>/plugins/<id>
```

Drop a new directory in, restart, done — it appears in every TV's configurator.

Bundled plugins: `time`, `weather`, `todo` (manager page), `note` (editor page),
`calendar` (events page), `f1`.

### Wiring real data

Weather and F1 ship with clearly-marked mock data; see the comments at the top
of `server/plugins/weather/index.js` and `server/plugins/f1/index.js` for where
to plug in a real provider (Open-Meteo, Jolpica/Ergast, …) — keep the returned
shape and everything downstream (renderers, live sync) keeps working.

## Data & API

State lives in flat JSON under `data/` (safe to edit while stopped).

- `GET /api/tv/:id` — config + plugin manifest
- `PATCH /api/tv/:id/config` — deep-merge partial config, broadcasts to clients
- `GET /api/tv/:id/data` — current payload for every plugin
- `GET /api/tv/:id/events` — SSE stream (`config`, `data` events)
- `GET/POST/PATCH/DELETE /api/plugins/todo/items[/:id]`
- `GET/PUT /api/plugins/note/content`
- `GET/POST/DELETE /api/plugins/calendar/events[/:id]`
