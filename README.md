# IDGG

IDGG is a university qualification project for looking up League of Legends players by Riot ID. It displays profile information, solo and flex rank, and statistics from up to ten recent matches.

## Requirements

- Node.js 24.21.0
- npm 12.0.2
- A PostgreSQL database
- A Riot Games account and an API key from the [Riot Developer Portal](https://developer.riotgames.com/)

The Node.js and npm versions match the versions declared by both package manifests.

## Clean installation

From the repository root, install the frontend and backend dependencies from their lockfiles:

```text
npm ci
npm --prefix backend ci
```

Both commands must complete successfully. Use `npm ci`, rather than `npm install`, when verifying a fresh checkout so the installed dependencies match the committed lockfiles.

## Backend configuration

Create `backend/.env` and add your PostgreSQL connection URL and Riot API key:

```dotenv
DATABASE_URL=postgresql://database-user:database-password@localhost:5432/idgg
RIOT_API_KEY=your-riot-api-key
```

Keep database credentials and the Riot API key only in this server-side environment file. Environment files are ignored by Git and must not be committed, placed in frontend source, or included in browser URLs.

The backend stops during startup when either required value is missing, empty, or invalid. It verifies the PostgreSQL connection before listening for requests. Local development defaults to port 4000, origin `http://localhost:3000`, and EUW/EUNE platform discovery.

The complete typed environment contract, including staging and production requirements and variables reserved for later operational tasks, is documented in [the environment contract](docs/operations/environment.md). Staging and production require an explicit HTTPS `PUBLIC_ORIGIN`, `TRUST_PROXY_HOPS`, and `RELEASE_VERSION`. Secrets must never use a `VITE_` prefix.

Apply pending database migrations from the repository root:

```text
npm --prefix backend run migrate
```

Non-empty migrations run in filename order and are recorded in the database. Empty placeholder files are ignored until they contain SQL, and applied migration files must not be changed. The backend also applies pending migrations during startup and does not listen if migration fails.

Development migrations use `MIGRATION_DATABASE_URL` when supplied and otherwise retain the existing `DATABASE_URL` fallback. Staging and production migrations require a separate `MIGRATION_DATABASE_URL`; its value must be provided only through the hosting environment. Because the current backend still applies migrations during startup, the staging and production web process temporarily requires this value until a later least-privilege task moves migration execution into a release job.

## Local development

Start the backend from the `backend` directory:

```text
cd backend
npm run dev
```

The PostgreSQL database must be running before the backend starts. After a successful database connection, the Express server listens on `http://localhost:4000`.

In a second terminal, start the frontend from the repository root:

```text
npm run dev
```

Open `http://localhost:3000`. Vite forwards same-origin `/api` requests to the backend during development.

Enter a Riot ID in `Game Name#Tagline` format. The application separates the game name and tagline and discovers the player's supported platform automatically.

## Report caching

Reports remain fresh for five minutes. Requests for the same normalized Riot ID share one in-process lookup or refresh, so concurrent requests do not duplicate Riot synchronization work. Successful report responses contain the report plus cache metadata:

```json
{
    "report": {
        "summoner": {
            "puuid": "example-puuid",
            "profileIconId": 1,
            "summonerLevel": 1
        },
        "league": [],
        "games": []
    },
    "cache": {
        "source": "cache",
        "fetchedAt": "2026-09-19T12:00:00.000Z"
    }
}
```

`cache.source` is `sync` when the request performed or joined a synchronization and `cache` when it reused a fresh stored report. Synchronization failures are returned as errors and are not replaced with stale data.

## Baseline verification

Run these checks from the repository root:

```text
npm run typecheck
npm --prefix backend run typecheck
npm run build
```

The first command checks the React application. The second checks every backend TypeScript file with strict settings. The production build repeats the frontend typecheck before building the Vite application into `dist`.

After both development servers are running, verify the application manually:

1. Run the database migration command twice and confirm the first run applies pending migrations while the second reports that the schema is up to date.
2. On a fresh database, confirm `schema_migrations` records `001_create_report_cache.sql` and `report_cache` exists with no rows.
3. Confirm the backend does not listen when `DATABASE_URL` is missing or unreachable.
4. Start PostgreSQL and confirm the backend listens only after its connection and migrations succeed.
5. Open `http://localhost:3000` and search for a known Riot ID.
6. Confirm the profile icon, summoner level, solo and flex rank states, items, spells, runes, and champion images render.
7. Confirm the page shows up to ten recent matches and that the summary reports the number actually displayed.
8. Confirm ranked solo, ranked flex, normal, ARAM, and other known queues are not all labeled as ranked solo.
9. In the browser network panel, confirm the report uses one same-origin `/api/report` request and does not call `localhost:4000` directly.
10. Search for an invalid Riot ID and confirm the not-found state appears without showing stale player data.
11. Send two concurrent requests for an uncached or older-than-five-minutes Riot ID and confirm both return `cache.source` as `sync` with the same `cache.fetchedAt` value.
12. Request the same Riot ID again within five minutes and confirm `cache.source` is `cache` and `cache.fetchedAt` is unchanged.

A complete baseline requires the clean installation commands, all TypeScript and build commands, and one successful authorized player lookup.

## Deployment note

The Vite `/api` proxy is for local development. A deployed frontend must use its hosting or reverse-proxy configuration to send same-origin `/api` requests to the Express backend over HTTPS. The Riot API key must remain available only to the backend process.

The backend exposes `GET /health` for process liveness and `GET /ready` for traffic readiness. Liveness does not depend on Riot or PostgreSQL. Readiness returns HTTP 200 only after startup checks and migrations complete and while PostgreSQL is reachable; it returns HTTP 503 after shutdown begins or when the database check fails. Both responses disable caching and contain only a status value.

`SIGINT` and `SIGTERM` make readiness fail immediately, stop new HTTP connections, drain active connections, and close PostgreSQL. `SHUTDOWN_GRACE_MS` bounds the drain before the process terminates with an error. Unknown routes and unexpected failures return stable JSON without exception details, credentials, or upstream response bodies.

Build the portable production artifact from the repository root:

```text
npm run build:production
```

This emits browser assets into `dist` and compiled backend files plus migration SQL into `backend/dist`. Start the compiled artifact with `npm --prefix backend run start:production`, or run its migration entry point with `npm --prefix backend run migrate:production`. In staging and production, Express serves the Vite assets and browser routes while keeping `/api` same-origin. Startup fails before listening when the frontend index is missing.

Build the provider-neutral container from the repository root with `docker build -t idgg .`. The multi-stage image compiles both applications, installs only backend production dependencies in the final image, includes migration SQL, contains no local environment files, runs as the unprivileged `node` user, and starts the compiled backend directly. Supply all required environment values at runtime; do not put them in the image or build arguments.

## Production readiness

The current public-operation inventory, confirmed gaps, decisions, and launch blockers are recorded in [the production-readiness audit](docs/operations/production-readiness-audit.md). The audit does not authorize a public launch. IDGG must remain private until its operational controls are implemented and Riot has approved production access.
