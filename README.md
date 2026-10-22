# QuasarFrame

QuasarFrame is a Next.js prototype for photography planning, location discovery, licensed live views, and digital-frame content. The Niubei pilot can use a locally built Copernicus GLO-30 terrain grid; other locations retain the labelled illustrative terrain. See the [terrain pilot guide](docs/p2-terrain-pilot.md), [photo assistant guide](docs/p3-photo-assistant.md), [implementation plan](docs/actionable-code-improvement-plan-2026-10-18.md), and [GeoNexus-inspired refactor proposal](docs/geonexus-inspired-refactor-plan-2026-10-22.md).

## Local setup

Use Node 22 (the repository pins 22.22.1 in `.nvmrc`). The default Node on some existing machines is too old for Next.js 16.

```sh
nvm use
npm ci
cp .env.example .env.local
```

Set a unique `AUTH_SECRET` in `.env.local`. The example uses a **new** `quasarframe.dev.db` file, so existing `quasarframe.db` data is not changed. Then create the schema and start the app:

```sh
npm run db:migrate
ALLOW_DEMO_SEED=1 npm run db:seed
npm run dev
```

Open <http://localhost:3000>. The app uses webpack mode for development and production builds because this repository previously hit a Turbopack package-resolution problem. Cesium's browser assets are copied into `public/cesium` during install and are generated files.
The database commands explicitly load `.env.local`; environment variables already set in the shell take precedence.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

When changing `src/db/schema.ts`, run `npm run db:generate`, review the generated SQL in `drizzle/`, and apply it with `npm run db:migrate` against a fresh or backed-up database. Do not run the first migration directly against an existing database created with `db:push`: it already contains tables but has no migration history. Use the checked baseline procedure below first.

For an existing database created with `db:push`, first run `npm run db:baseline`. It checks the table columns and duplicate unlocks, makes a SQLite backup under `data/backups/`, and marks the initial schema as applied. Then run `npm run db:migrate` to add the unique unlock key. Stop if the schema check reports a mismatch; do not force a baseline. Run `npm run images:privatize` once to move legacy originals from `public/uploads/` into `data/originals/` and regenerate thumbnails without EXIF. The image migration preserves file names and is safe to rerun.

The seed creates demo accounts with known passwords and demonstration camera feeds. It requires `ALLOW_DEMO_SEED=1` and refuses to run when `NODE_ENV=production`; do not use it for a public instance. Public camera distribution is disabled by default. After verifying redistribution rights for a feed, put its ID in `AUTHORIZED_FEED_IDS` and explicitly allow each upstream origin in `FEED_UPSTREAM_ORIGINS`. The proxy blocks unlisted destinations, redirects, and private network addresses. New feeds remain inactive until an administrator reviews them.

`quasarframe*.db*`, `data/`, `public/uploads/`, `public/cesium/`, and terrain data are local/generated and ignored by Git. Never commit camera credentials, real `.env` files, uploaded originals, or user databases. Mock and unverified online payments are disabled; balance purchases are transactional. Frame-order creation requires a stable `Idempotency-Key` header per checkout attempt. A verified gateway callback, refund workflow, camera licensing records, and paid media policy remain required before public paid launch.

## Niubei terrain pilot

Install Python 3 with NumPy and Rasterio, then run `python3 scripts/terrain/build_niubei.py --download`. The four pinned public COGs and generated grid stay in ignored `terrain-data/`; the app loads them at startup. The process and field validation format are in [docs/p2-terrain-pilot.md](docs/p2-terrain-pilot.md). Without this local grid, the page labels its procedural 3D view as illustrative.

## Resource card pilot

`GET /api/resources` lists public resource cards for the SunCalc-based astronomy capability and any installed, validated Niubei DEM. `GET /api/resources/{id}` returns one card. The terrain analysis response includes its card ID, data version, source URL, attribution, checksum, and unverified-accuracy status. Missing or invalid local DEM data is not advertised as ready. The versioned JSON Schema is in `contracts/resource-card.v1.schema.json`; regenerate it after editing the Zod contract with `npm run resource-card:schema` under Node 22.
