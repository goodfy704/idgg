import { withDatabaseTransaction } from './database';

type RiotRateLimitRow = {
    window_seconds: unknown;
    request_limit: unknown;
    request_count: unknown;
    window_started_at: unknown;
    database_now: unknown;
};

type RiotRateLimit = {
    windowSeconds: number;
    requestLimit: number;
};

const riotRateLimits: RiotRateLimit[] = [
    {
        windowSeconds: 1,
        requestLimit: 20,
    },
    {
        windowSeconds: 120,
        requestLimit: 100,
    },
];

const reservationSafetyMilliseconds = 25;

const delay = async (milliseconds: number): Promise<void> => {
    await new Promise<void>(resolve => setTimeout(resolve, milliseconds));
};

const isPositiveInteger = (value: unknown): value is number => (
    typeof value === 'number'
    && Number.isInteger(value)
    && value > 0
);

const isNonnegativeInteger = (value: unknown): value is number => (
    typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
);

const isValidDate = (value: unknown): value is Date => (
    value instanceof Date && !Number.isNaN(value.getTime())
);

const parseRateLimitRow = (row: RiotRateLimitRow) => {
    if (
        !isPositiveInteger(row.window_seconds)
        || !isPositiveInteger(row.request_limit)
        || !isNonnegativeInteger(row.request_count)
        || !isValidDate(row.window_started_at)
        || !isValidDate(row.database_now)
    ) {
        throw new Error('Stored Riot rate limit is invalid.');
    }

    return {
        windowSeconds: row.window_seconds,
        requestLimit: row.request_limit,
        requestCount: row.request_count,
        windowStartedAt: row.window_started_at,
        databaseNow: row.database_now,
    };
};

const reserveRiotRequest = async (routingValue: string): Promise<number> => (
    withDatabaseTransaction(async client => {
        for (const rateLimit of riotRateLimits) {
            await client.query(`
                INSERT INTO riot_rate_limits (
                    routing_value,
                    window_seconds,
                    request_limit
                )
                VALUES ($1, $2, $3)
                ON CONFLICT (routing_value, window_seconds) DO NOTHING
            `, [
                routingValue,
                rateLimit.windowSeconds,
                rateLimit.requestLimit,
            ]);
        }

        const windowSeconds = riotRateLimits.map(rateLimit => rateLimit.windowSeconds);
        const result = await client.query<RiotRateLimitRow>(`
            UPDATE riot_rate_limits
            SET
                request_count = CASE
                    WHEN window_started_at
                        + (window_seconds * INTERVAL '1 second') <= clock_timestamp()
                    THEN 0
                    ELSE request_count
                END,
                window_started_at = CASE
                    WHEN window_started_at
                        + (window_seconds * INTERVAL '1 second') <= clock_timestamp()
                    THEN clock_timestamp()
                    ELSE window_started_at
                END,
                updated_at = clock_timestamp()
            WHERE routing_value = $1
                AND window_seconds = ANY($2::integer[])
            RETURNING
                window_seconds,
                request_limit,
                request_count,
                window_started_at,
                clock_timestamp() AS database_now
        `, [routingValue, windowSeconds]);

        if (result.rows.length !== riotRateLimits.length) {
            throw new Error('Riot rate limits could not be reserved.');
        }

        let waitMilliseconds = 0;

        for (const row of result.rows) {
            const rateLimit = parseRateLimitRow(row);

            if (rateLimit.requestCount < rateLimit.requestLimit) {
                continue;
            }

            const windowEnd = rateLimit.windowStartedAt.getTime()
                + rateLimit.windowSeconds * 1000;
            const remainingMilliseconds = windowEnd - rateLimit.databaseNow.getTime();
            const safeWaitMilliseconds = Math.max(remainingMilliseconds, 0)
                + reservationSafetyMilliseconds;
            waitMilliseconds = Math.max(waitMilliseconds, safeWaitMilliseconds);
        }

        if (waitMilliseconds > 0) {
            return Math.ceil(waitMilliseconds);
        }

        const reservation = await client.query(`
            UPDATE riot_rate_limits
            SET
                request_count = request_count + 1,
                updated_at = clock_timestamp()
            WHERE routing_value = $1
                AND window_seconds = ANY($2::integer[])
        `, [routingValue, windowSeconds]);

        if (reservation.rowCount !== riotRateLimits.length) {
            throw new Error('Riot rate limits could not be reserved.');
        }

        return 0;
    })
);

export async function waitForRiotRateLimit(routingValue: string): Promise<void> {
    const normalizedRoutingValue = routingValue.trim().toLocaleLowerCase('en-US');

    if (!/^[a-z0-9]{2,16}$/.test(normalizedRoutingValue)) {
        throw new Error('Riot routing value is invalid.');
    }

    while (true) {
        const waitMilliseconds = await reserveRiotRequest(normalizedRoutingValue);

        if (waitMilliseconds === 0) {
            return;
        }

        await delay(waitMilliseconds);
    }
}
