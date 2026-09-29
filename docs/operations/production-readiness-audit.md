# IDGG production-readiness audit

Audit date: 2026-09-29

Audited revision: `39f1732`

## Status

IDGG is not ready for public operation. The current checkout has a working local React frontend, Express backend, PostgreSQL report cache, report synchronization leases, shared Riot rate limiting, and timeline storage primitives. It does not yet have a production artifact, same-origin production serving, health or readiness endpoints, structured observability, data lifecycle operations, backup recovery evidence, public privacy and legal pages, a private staging deployment, or Riot production approval.

The current checkout also does not expose the Milestone 4 practice loop. The practice component, practice type, focus storage, and backend metric files are empty, `playerPage.tsx` does not render a practice review, and `/api/report` does not return practice data. Timeline persistence exists, but the timeline synchronization function has no production caller. Public-readiness work must not treat the practice loop as available until the intended Milestone 4 implementation is restored and revalidated.

This document records facts and blockers. It does not authorize deployment or claim that any launch gate has passed.

## Current application and build

- The frontend is React 18 with Vite 6 and TypeScript.
- `npm run typecheck` runs `tsc --noEmit` for the frontend.
- `npm run build` repeats the frontend typecheck and emits static assets into `dist`.
- Vite proxies `/api` to `http://localhost:4000` only during local development.
- Express does not serve `dist`, so there is no production same-origin frontend and API configuration.
- The backend runs TypeScript directly with `tsx proxyServer.ts` and has no emitted production build.
- The repository has no Dockerfile, deployment manifest, release job, infrastructure definition, or monitoring configuration.

## Backend lifecycle and HTTP surface

- Express exposes `GET /api/report` and the legacy `GET /championStats` route.
- `/api/report` accepts `gameName` and `tagLine` in the query string and returns `report` plus `cache` metadata.
- Frontend player routes contain the Riot ID in `/player/:gameName/:tagLine`.
- Query strings and player paths can therefore place Riot IDs in browser history, referrers, reverse-proxy logs, CDN logs, and hosting access logs.
- `/championStats` can request 25 additional matches, streams concatenated JSON, waits between batches, and logs champion names. The frontend calculates champion summaries from `/api/report` and does not call this route.
- There is no liveness, readiness, metrics, version, or deployment-information endpoint.
- Startup verifies PostgreSQL, applies migrations, and only then starts listening.
- `SIGINT` and `SIGTERM` stop accepting new connections and close the database pool, but shutdown has no readiness transition or maximum drain deadline.
- There is no explicit production 404 behavior, proxy trust configuration, HTTPS enforcement, host validation, security-header policy, request body limit, or inbound abuse limit.
- Route errors normally return generic messages, but unexpected exceptions log the raw error message.

## Environment contract and secrets

The current runtime reads only these environment variables:

- `DATABASE_URL`, required by the database pool and migration runner.
- `RIOT_API_KEY`, required by the Riot client and sent only through the `X-Riot-Token` header.
- `PORT`, optional and defaulting to 4000.

There is no centralized typed environment parser or distinction between local, staging, migration, maintenance, and production credentials. The same database connection string is used for runtime DML and schema migration.

A tracked-source scan found no Riot or RGAPI credential and no `api_key` query parameter. `README.md` contains only a placeholder variable value. Production secrets must remain hosting-environment values and must never use a frontend `VITE_` variable.

## PostgreSQL and migrations

The migration runner currently provides useful safety properties:

- Migration filenames are validated and applied in lexical order.
- Applied migration checksums are recorded and later verified.
- A PostgreSQL advisory lock serializes migration runners.
- Each non-empty migration runs in a transaction.
- A migration failure prevents backend startup.

The current schema contains:

| Relation | Stored purpose and data |
| --- | --- |
| `schema_migrations` | Migration names, checksums, and application times. |
| `report_cache` | Normalized Riot ID cache key, game name, tagline, searched PUUID, platform, regional route, report JSON, and timestamps. |
| `report_sync_state` | Cache or synchronization key, lease owner UUID, lease expiry, and timestamps. |
| `riot_rate_limits` | Riot routing value, configured windows, counters, limits, and timestamps. |
| `match_timelines` | Match ID, regional route, raw validated timeline JSON, and timestamps. |

Production gaps:

- The web process applies migrations and therefore requires schema-changing privileges.
- There is no separate migration credential, runtime role, maintenance role, or backup role.
- The PostgreSQL pool has no explicit TLS verification, connection timeout, statement timeout, idle timeout, or production pool-size contract.
- Runtime readiness does not verify that the expected schema is already applied.
- No migration is currently dedicated to retention or deletion query support.

## Riot synchronization and cache behavior

- Reports remain fresh for five minutes.
- Report requests use in-process single-flight synchronization.
- Report refreshes use PostgreSQL leases, including renewal and release, to coordinate multiple backend processes.
- Every current Riot request goes through `requestRiot`, which sends the API key in a header, validates the Riot hostname, waits on the PostgreSQL coordinator, and applies a shared `Retry-After` cooldown for 429 responses.
- The coordinator is conservatively fixed at 20 requests per second and 100 requests per 120 seconds per routing value.
- Stored timelines are reused when `getOrSyncMatchTimeline` is called, but timeline synchronization currently has only in-process single-flight protection and is not wired into `/api/report`.
- Player discovery calls the Europe account route and may scan 17 platform routes. The intended first public pilot is EUW/EUNE, but that scope is not configurable or enforced.
- The public product must not open using a development or personal key. The current conservative limiter may remain below production-key limits, but capacity must be observed rather than assumed.

## Stored player and match data

`report_cache.report` contains the searched summoner PUUID, rank entries, and up to ten Match-v5 matches. Each match contains all participants' PUUIDs, Riot IDs, champion, role, result, items, spells, runes, and combat and farming statistics.

`match_timelines.timeline` is capable of retaining all timeline participant PUUIDs, minute frames, gold, experience, level, minion counts, optional positions, and events accepted by the schema. Timeline storage is present even though the current HTTP report flow does not populate or use it.

`report_sync_state` may contain a normalized Riot ID cache key or a timeline-derived key. `riot_rate_limits` contains operational routing counters rather than player data.

The current checkout has no functioning saved-focus persistence. The intended practice component and browser-local focus storage files exist but are empty. There is no PostgreSQL focus table.

## Retention, deletion, privacy, and backup state

- Reports, timelines, stale synchronization rows, and rate-limit rows have no retention operation.
- There is no player-data deletion command or endpoint.
- Deleting only the report whose searched PUUID matches would be incomplete because other reports and timelines can contain that PUUID as a participant.
- There is no privacy notice, terms page, data-processing inventory, deletion-request procedure, or public privacy contact.
- There is no suppression mechanism preventing later lookup from recreating deleted public Riot data.
- There is no configured backup policy, portable logical backup, recorded recovery-point objective, recorded recovery-time objective, or proven restore procedure.
- There is no authentication. A destructive public deletion endpoint would therefore be unsafe; the smallest private-pilot control is an operator-only, transactionally complete deletion procedure.

Recommended starting policy for later implementation is 30 days from last fetch for reports and timelines, 24 hours for expired synchronization rows, managed point-in-time recovery, a weekly portable logical backup, a recovery-point objective of at most 24 hours, and a recovery-time objective of at most four hours. These values are product defaults, not verified Riot requirements.

## Logging, monitoring, and credential exposure

Current logging uses unstructured `console.log` and `console.error` calls.

Positive findings:

- Explicit log calls do not print the Riot API key, database URL, PUUID, Riot ID, match ID, upstream response body, or SQL parameter.
- Riot request errors retain only status and `Retry-After` information.
- The database pool error message is generic.

Open risks and gaps:

- `/championStats` logs champion names and game counts.
- Unexpected errors log raw `error.message`, which has no enforced redaction boundary.
- Player identity is present in current HTTP paths and query strings even when application logs omit it.
- There are no request IDs, structured fields, log levels, release identifiers, or retention rules.
- There are no application metrics, dashboards, alerts, independent availability checks, or persistent runtime-log destination.
- Availability, error rate, latency, Riot synchronization, cache behavior, leases, rate-limit waits, cooldowns, database readiness, and failed migrations are not monitored.

## Riot policy and approval gates

The following are verified against current official Riot documentation:

- A development key is temporary, expires every 24 hours, and is intended for non-public prototype work.
- A personal key cannot be used for public consumption, including an open alpha or beta.
- A player-serving public product must be registered and requires production access.
- Riot normally expects a functional or near-functional website for a production application.
- The website must expose its privacy policy and terms and must support Riot's domain-verification process.
- Riot's prescribed legal disclaimer must be readily visible to players.
- Riot API traffic must use HTTPS, and the API key must not be embedded in code or browser-delivered assets.
- One production key may serve only the approved product.
- The product must not create an alternative MMR or ranking system, analyze deliberately hidden players, or provide an unfair real-time advantage.

Official references:

- [Riot Developer Portal](https://developer.riotgames.com/docs/portal)
- [League of Legends developer policy](https://developer.riotgames.com/docs/lol)
- [General developer policy](https://developer.riotgames.com/policies/general)
- [Production application FAQ](https://developer.riotgames.com/docs/faqs)
- [Site verification procedure](https://developer.riotgames.com/how-to-verify-site.html)

Riot's public documentation does not specify IDGG's exact retention period, deletion interface, backup schedule, hosting provider, or monitoring vendor. Those remain product, privacy, and operational decisions. Riot retains authority over production approval.

## Deployment recommendation and decisions

The recommended first approved pilot topology is:

- One compiled Node and Express service serving the Vite assets and same-origin `/api` routes.
- One same-region managed PostgreSQL database.
- One application instance for approximately 100 activated EUW/EUNE users.
- Managed HTTPS termination at the hosting ingress.
- Private development-key staging protected by HTTPS authentication.
- No Kubernetes, GPU, Redis, separate frontend service, or background-worker cluster.

The recommended provider is DigitalOcean App Platform with Managed PostgreSQL in the closest suitable EU region. Provider configuration belongs in a later provider-specific task; the production container, environment contract, migrations, logging, and lifecycle behavior must remain portable.

Decisions still requiring the project owner's confirmation:

| Decision | Recommended default | Status |
| --- | --- | --- |
| Operational owner and incident contact | One named primary and one fallback contact | Open |
| Hosting provider | DigitalOcean App Platform and Managed PostgreSQL | Open |
| Region | Same EU region for application and database, preferring Frankfurt when available | Open |
| Pilot scope | EUW and EUNE only | Open |
| Runtime topology | One frontend and backend service plus managed PostgreSQL | Open |
| Private staging gate | HTTPS Basic authentication | Open |
| Database availability | Single managed node for private staging and first pilot; revisit before growth | Open |
| Retention | Reports and timelines 30 days; expired synchronization rows 24 hours | Open |
| Runtime log retention | 14 days with player identifiers excluded | Open |
| Deletion | Operator-only transaction with dry-run and confirmation | Open |
| Backup targets | Managed PITR plus weekly logical backup; RPO 24 hours and RTO four hours | Open |
| Observability | Provider metrics plus a portable external log, metric, alert, and uptime service | Open |

## Blocker register

| ID | Severity | Open blocker | Planned resolution |
| --- | --- | --- | --- |
| PR-01 | Critical | The current checkout does not expose the claimed practice loop or saved focus behavior. | Restore and manually revalidate the intended Milestone 4 implementation before staging sign-off. |
| PR-02 | Critical | No Riot production approval or production key is recorded. | Riot application and production-access task. |
| PR-03 | Critical | No production artifact serves frontend and backend from one origin. | Portable production packaging task. |
| PR-04 | Critical | No private staging deployment or staging access gate exists. | HTTP security and provider-specific staging tasks. |
| PR-05 | High | No centralized environment contract or separation of runtime, migration, and maintenance credentials exists. | Environment-contract and database least-privilege tasks. |
| PR-06 | High | No health, readiness, bounded shutdown, or health-gated deployment behavior exists. | Server lifecycle task. |
| PR-07 | High | Migrations run inside the web process with the runtime database credential. | Migration and least-privilege task. |
| PR-08 | High | Riot IDs appear in paths and query strings. | Identifier-safe routing and request-transport task. |
| PR-09 | High | There is no retention or complete participant-aware deletion operation. | Data lifecycle task. |
| PR-10 | High | No backup restore or application rollback has been demonstrated. | Recovery drill task. |
| PR-11 | High | No structured logging, application telemetry, dashboards, or alerts exist. | Logging and telemetry tasks. |
| PR-12 | High | No privacy notice, terms, visible Riot disclaimer, or deletion-request process exists. | Privacy and Riot compliance tasks. |
| PR-13 | Medium | The unused `/championStats` endpoint performs unnecessary Riot requests and logs champion data. | Identifier-safe routing and surface-reduction task. |
| PR-14 | Medium | Timeline synchronization is not wired into the report and lacks cross-process lease use. | Restore the already agreed Milestone 3 and 4 integration before staging; do not redesign it in Milestone 5. |
| PR-15 | Medium | Platform discovery scans regions outside the intended EUW/EUNE pilot. | Environment contract and pilot-scope enforcement. |
| PR-16 | Medium | `README.md` does not describe migrations 002 through 004 or the current incomplete practice state. | Keep operational documentation synchronized as later tasks land. |

## Validation baseline

The existing repository checks are:

```text
npm run typecheck
npm --prefix backend run typecheck
npm --prefix backend run migrate
npm run build
```

The migration command must run only against the explicitly selected local or disposable database. A later packaging task must add a production backend build without weakening the current strict TypeScript checks.

The minimum manual production-readiness evidence remains:

- A clean checkout installs from both lockfiles and builds.
- A fresh database applies all four current migrations and reports no pending migration on the second run.
- A supported authorized account works through the intended same-origin report and practice flow.
- No secret appears in source, browser assets, URLs, logs, build output, or operational evidence.
- Private staging remains inaccessible without its staging gate.
- Health, readiness, shutdown, migration failure, database failure, Riot failure, cache behavior, rate limiting, retention, deletion, backup restore, and application rollback are demonstrated.
- Riot production approval and every item in the final launch checklist pass before public access is enabled.

## Audit maintenance

Each Milestone 5 task must update this audit when it resolves a blocker or changes stored data, environment variables, public routes, operational ownership, deployment topology, or external dependencies. Closing a blocker requires implementation evidence and the applicable manual validation; documentation alone is not sufficient.
