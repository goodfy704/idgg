# Environment contract

## Purpose

IDGG reads backend configuration only from the process environment. Local development may load `backend/.env` through `dotenv`, but staging and production values must be supplied by the hosting environment. Secrets must not be committed, placed in frontend variables, provided as Docker build arguments, printed in logs, or included in operational evidence.

`backend/config.ts` is the only production source that reads `process.env`. Consumers receive validated typed values. Validation errors identify the variable and requirement without reproducing its value.

## Deployment environments

`NODE_ENV` accepts exactly `development`, `staging`, or `production` and defaults to `development`.

- `development` permits localhost defaults and lets migrations fall back to `DATABASE_URL`.
- `staging` requires an HTTPS public origin, an explicit proxy-hop count, a release identifier, and a separate migration URL when the migration command runs.
- `production` has the same fail-closed requirements as staging. Public access additionally remains blocked by the Riot and launch gates recorded in the production-readiness audit.

Changing `NODE_ENV` does not grant access, apply security headers, enable telemetry, run retention, or create infrastructure. Those behaviors belong to later Milestone 5 tasks.

## Active variables

| Variable | Type and validation | Required | Default | Secret | Current consumer |
| --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | `development`, `staging`, or `production` | No | `development` | No | All configuration scopes |
| `DATABASE_URL` | PostgreSQL connection URL naming a database | Backend runtime in every environment; development migration fallback | None | Yes | PostgreSQL pool |
| `MIGRATION_DATABASE_URL` | PostgreSQL connection URL naming a database | Migration command and current backend startup in staging and production | Development uses `DATABASE_URL` | Yes | Migration runner |
| `RIOT_API_KEY` | Non-empty string | Backend runtime in every environment | None | Yes | Riot request header |
| `PORT` | Integer from 1 through 65535 | No | `4000` | No | Express listener |
| `PUBLIC_ORIGIN` | Credential-free origin with no path, query, or fragment; HTTPS outside development | Staging and production | `http://localhost:3000` in development | No | Validated for later HTTPS and host enforcement |
| `TRUST_PROXY_HOPS` | Integer from 0 through 16 | Staging and production | `0` in development | No | Validated for later proxy enforcement |
| `SHUTDOWN_GRACE_MS` | Integer from 1000 through 120000 milliseconds | No | `25000` | No | Validated for the lifecycle task |
| `RELEASE_VERSION` | 1 through 128 letters, digits, periods, underscores, or hyphens, beginning with a letter or digit | Staging and production | `development` in development | No | Validated for later logs and telemetry |
| `SUPPORTED_PLATFORMS` | Unique comma-separated Riot platform values | No | `eun1,euw1` | No | Player platform discovery |
| `LOG_LEVEL` | `debug`, `info`, `warn`, or `error` | No | `info` | No | Validated for the structured-logging task |

`SUPPORTED_PLATFORMS` accepts `br1`, `eun1`, `euw1`, `jp1`, `kr`, `la1`, `la2`, `me1`, `na1`, `oc1`, `ph2`, `ru`, `sg2`, `th2`, `tr1`, `tw2`, and `vn2`. The EUW/EUNE default is the agreed first-pilot boundary and reduces unnecessary platform discovery calls. Expanding it is a product and capacity decision, not a deployment convenience.

## Reserved variables for later tasks

These names complete the portable contract, but the current task does not activate their behavior.

| Variable | Type and validation to enforce when consumed | Required environment | Default | Secret | Owning task |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_SSL_MODE` | `disable`, `require`, or `verify-full` | Staging and production | `disable` only in development | No | Database least privilege and TLS |
| `DATABASE_SSL_CA` | Non-empty PEM certificate data | When `DATABASE_SSL_MODE` is `verify-full` | None | Yes | Database least privilege and TLS |
| `MAINTENANCE_DATABASE_URL` | PostgreSQL connection URL naming a database | Data lifecycle command in staging and production | None | Yes | Retention and deletion |
| `ACCESS_MODE` | `private` or `public` | Staging and production | `private` in staging; `public` only after launch approval | No | HTTP security |
| `STAGING_BASIC_AUTH_USERNAME` | Non-empty bounded string | Private staging | None | Yes | HTTP security |
| `STAGING_BASIC_AUTH_PASSWORD` | Non-empty bounded string | Private staging | None | Yes | HTTP security |
| `REPORT_RETENTION_DAYS` | Positive integer days | When lifecycle commands are enabled | `30` | No | Retention and deletion |
| `TIMELINE_RETENTION_DAYS` | Positive integer days | When lifecycle commands are enabled | `30` | No | Retention and deletion |
| `SYNC_STATE_RETENTION_HOURS` | Positive integer hours | When lifecycle commands are enabled | `24` | No | Retention and deletion |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | HTTPS URL | When external telemetry is enabled | Telemetry disabled | No | Telemetry and monitoring |
| `OTEL_EXPORTER_OTLP_HEADERS` | Provider authorization headers | When external telemetry is enabled | None | Yes | Telemetry and monitoring |
| `OTEL_SERVICE_NAME` | Non-empty bounded service identifier | No | `idgg` | No | Telemetry and monitoring |

Reserved variables must be parsed in `backend/config.ts` when their owning task is implemented. Until then, setting one does not imply that the associated control exists.

## Scope behavior

The backend modules expose three independent scopes:

- Server configuration validates deployment metadata and chooses the allowed Riot platform discovery list.
- Database configuration requires `DATABASE_URL` without loading migration-only credentials.
- Riot configuration requires `RIOT_API_KEY` without exposing it outside the Riot client.

The migration command loads only the deployment environment and database migration scope. In development, `MIGRATION_DATABASE_URL` is optional and `DATABASE_URL` remains compatible with the established local workflow. In staging and production, the command fails before connecting unless `MIGRATION_DATABASE_URL` is present and valid.

The current backend still invokes the migration runner during startup. Until the later migration and least-privilege task removes that call, the staging and production web process also needs `MIGRATION_DATABASE_URL` and can access the migration credential. This is a recorded transitional limitation, not the target ownership model.

## Secret ownership and rotation

- `RIOT_API_KEY` belongs only to the backend runtime service and the approved Riot product.
- `DATABASE_URL` belongs only to the web runtime and must eventually use the least-privilege runtime role.
- `MIGRATION_DATABASE_URL` is intended to belong only to the release migration job after startup migration is removed. The current web process temporarily requires it outside development.
- `MAINTENANCE_DATABASE_URL` will belong only to controlled retention and deletion operations.
- Staging access credentials belong only to the private staging ingress.
- Telemetry authorization belongs only to the backend runtime and must not be added to log fields.
- No secret may use a `VITE_` prefix because Vite exposes such variables to browser bundles.

Rotate one secret at a time through the hosting environment, redeploy or restart the affected process, verify readiness and the intended operation, and then revoke the old value. Never record either value in Git, command output, screenshots, or the audit.

## Manual verification

From the repository root, use the established commands with an explicitly selected local or disposable database:

```text
npm run typecheck
npm --prefix backend run typecheck
npm --prefix backend run migrate
npm run build
```

Verify the contract without printing values:

1. Start development with the existing local `DATABASE_URL` and `RIOT_API_KEY`; confirm localhost defaults are accepted.
2. Set each bounded integer or enum to an invalid value and confirm startup fails with only the variable name and requirement.
3. Set `SUPPORTED_PLATFORMS` to an unknown, empty, or duplicate entry and confirm startup fails before listening.
4. Set `NODE_ENV` to staging or production without `PUBLIC_ORIGIN`, `TRUST_PROXY_HOPS`, or `RELEASE_VERSION` and confirm startup fails before listening.
5. Use a non-HTTPS `PUBLIC_ORIGIN` outside development and confirm it is rejected.
6. Run the migration command outside development without `MIGRATION_DATABASE_URL` and confirm it fails before connecting.
7. Supply a valid separate migration connection through the environment and confirm two migration runs report an up-to-date schema on the second run.
8. Inspect frontend build output and confirm no backend secret name has been populated with a secret value.
