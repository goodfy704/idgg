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

The backend stops during startup when either required value is missing or empty. It verifies the PostgreSQL connection before listening for requests.

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

## Baseline verification

Run these checks from the repository root:

```text
npm run typecheck
npm --prefix backend run typecheck
npm run build
```

The first command checks the React application. The second checks every backend TypeScript file with strict settings. The production build repeats the frontend typecheck before building the Vite application into `dist`.

After both development servers are running, verify the application manually:

1. Confirm the backend does not listen when `DATABASE_URL` is missing or unreachable.
2. Start PostgreSQL and confirm the backend listens only after its connection succeeds.
3. Open `http://localhost:3000` and search for a known Riot ID.
4. Confirm the profile icon, summoner level, solo and flex rank states, items, spells, runes, and champion images render.
5. Confirm the page shows up to ten recent matches and that the summary reports the number actually displayed.
6. Confirm ranked solo, ranked flex, normal, ARAM, and other known queues are not all labeled as ranked solo.
7. In the browser network panel, confirm the report uses one same-origin `/api/report` request and does not call `localhost:4000` directly.
8. Search for an invalid Riot ID and confirm the not-found state appears without showing stale player data.

A complete baseline requires the clean installation commands, all TypeScript and build commands, and one successful authorized player lookup.

## Deployment note

The Vite `/api` proxy is for local development. A deployed frontend must use its hosting or reverse-proxy configuration to send same-origin `/api` requests to the Express backend over HTTPS. The Riot API key must remain available only to the backend process.
