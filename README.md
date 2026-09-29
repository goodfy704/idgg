# IDGG

IDGG is a university qualification project for looking up League of Legends players by Riot ID. It displays profile information, rank data, recent ranked-solo matches, and a private practice loop for EUW and EUNE BOTTOM players.

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

The backend stops during startup when either required value is missing or empty. It verifies the PostgreSQL connection before listening for requests.

Apply pending database migrations from the repository root:

```text
npm --prefix backend run migrate
```

Non-empty migrations run in filename order and are recorded in the database. Empty placeholder files are ignored until they contain SQL, and applied migration files must not be changed. The backend also applies pending migrations during startup and does not listen if migration fails.

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

Reports remain fresh for five minutes. Requests for the same normalized Riot ID share one in-process lookup or refresh, so concurrent requests do not duplicate Riot synchronization work. Successful report responses contain the report, cache metadata, and the practice analysis:

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
    },
    "practice": {
        "status": "ready",
        "version": 1,
        "generatedAt": "2026-09-19T12:00:00.000Z",
        "platform": "euw1",
        "supportedPlatforms": ["eun1", "euw1"],
        "queueId": 420,
        "role": "BOTTOM",
        "metrics": [
            { "key": "csAt10", "unit": "cs", "aggregation": "median" },
            { "key": "deathsAtOrBefore10", "unit": "deaths", "aggregation": "mean" },
            { "key": "totalGoldAt10", "unit": "gold", "aggregation": "median" }
        ],
        "matches": [],
        "consideredMatchCount": 0,
        "eligibleMatchCount": 0,
        "excludedMatchCount": 0
    }
}
```

`cache.source` is `sync` when the request performed or joined a synchronization and `cache` when it reused a fresh stored report. Synchronization failures are returned as errors and are not replaced with stale data.

## Practice loop

The initial practice audience is EUW and EUNE players assigned the `BOTTOM` role in ranked solo queue 420. The report evaluates up to ten recent ranked-solo matches and exposes three timeline-backed metrics:

- CS at 10 minutes is lane minions plus jungle minions from the exact 10:00 frame. Its sample aggregate is the median.
- Deaths by 10 minutes count champion-kill events where the player is the victim through 10:00. Its sample aggregate is the arithmetic mean.
- Total gold at 10 minutes comes from the exact 10:00 frame. Its sample aggregate is the median.

Matches are excluded explicitly when their queue, role, duration, player identity, timeline, 10-minute frame, or metric values are unsuitable. The interface shows sample sizes, exclusion reasons, and evidence containing the match ID, queue, role, champion, patch, game date, timeline time, and metric value.

A player can select one metric and save a focus. The focus and baseline are stored only in that browser under a PUUID-specific local-storage key. No account authentication or public notes are introduced. The player can clear the saved focus and baseline from the interface.

The saved baseline contains fixed match IDs, game-start times, metadata, and selected metric values. A current match enters the follow-up sample only when its ID is not in the baseline, its game-start timestamp is later than the focus save time, and its practice evidence is complete. Array position is never used to separate samples. The displayed difference is the follow-up aggregate minus the baseline aggregate; it is not a population benchmark or a claim about why a match was won or lost.

Stored reports and timelines, synchronization leases, and the shared Riot limiter are reused. Opening a report does not request a timeline again when a valid stored timeline already exists. The practice loop does not require an LLM or generated coaching text.

## Baseline verification

Run these checks from the repository root:

```text
npm run typecheck
npm --prefix backend run typecheck
npm --prefix backend run migrate
npm run build
```

The first command checks the React application. The second checks every backend TypeScript file with strict settings. The production build repeats the frontend typecheck before building the Vite application into `dist`.

After both development servers are running, verify the application manually:

1. Run the database migration command twice and confirm the first run applies pending migrations while the second reports that the schema is up to date.
2. On a fresh database, confirm `schema_migrations` records migrations 001 through 004 and the report cache, sync state, Riot rate-limit, and match timeline tables exist with no rows.
3. Confirm the backend does not listen when `DATABASE_URL` is missing or unreachable.
4. Start PostgreSQL and confirm the backend listens only after its connection and migrations succeed.
5. Open `http://localhost:3000` and search for a known Riot ID.
6. Confirm the profile icon, summoner level, solo and flex rank states, items, spells, runes, and champion images render.
7. Confirm the page shows up to ten recent ranked-solo matches and that the summary reports the number actually displayed.
8. For an EUW or EUNE BOTTOM player, confirm the practice review shows sample sizes, explicit exclusions, and evidence for CS, deaths, and total gold at 10 minutes.
9. In the browser network panel, confirm the report uses one same-origin `/api/report` request and does not call `localhost:4000` directly.
10. Search for an invalid Riot ID and confirm the not-found state appears without showing stale player data.
11. Send two concurrent requests for an uncached or older-than-five-minutes Riot ID and confirm both return `cache.source` as `sync` with the same `cache.fetchedAt` value.
12. Request the same Riot ID again within five minutes and confirm `cache.source` is `cache` and `cache.fetchedAt` is unchanged.
13. Save one practice focus, refresh, and confirm the same PUUID restores the selected metric and fixed baseline.
14. Open another player and confirm the first player's saved focus is not displayed.
15. Return after a newer eligible match and confirm it appears only in follow-up, while baseline match IDs are not counted again.
16. Confirm the baseline and follow-up evidence cards show queue, role, champion, patch, game date, match ID, timeline time, and metric value.
17. Clear the saved focus, refresh, and confirm the browser-local baseline no longer appears.
18. Temporarily stop the backend and confirm the unavailable page explains the failure and offers retry and new-search actions.

A complete baseline requires the clean installation commands, all TypeScript and build commands, and one successful authorized player lookup.

## Deployment note

The Vite `/api` proxy is for local development. A deployed frontend must use its hosting or reverse-proxy configuration to send same-origin `/api` requests to the Express backend over HTTPS. The Riot API key must remain available only to the backend process.
