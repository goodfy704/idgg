import { withDatabaseTransaction } from './database';

type RiotRateLimitRow = {
    window_seconds: unknown;
    request_limit: unknown;
    request_count: unknown;
    window_started_at: unknown;
    database_now: unknown;
};

type RiotCooldownRow = {
    cooldown_until: unknown;
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
const cooldownRateLimit = riotRateLimits.reduce((shortest, candidate) => (
    candidate.windowSeconds < shortest.windowSeconds ? candidate : shortest
));

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

const normalizeRoutingValue = (routingValue: string): string => {
    const normalizedRoutingValue = routingValue.trim().toLocaleLowerCase('en-US');

    if (!/^[a-z0-9]{2,16}$/.test(normalizedRoutingValue)) {
        throw new Error('Riot routing value is invalid.');
    }

    return normalizedRoutingValue;
};

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
    const normalizedRoutingValue = normalizeRoutingValue(routingValue);

    while (true) {
        const waitMilliseconds = await reserveRiotRequest(normalizedRoutingValue);

        if (waitMilliseconds === 0) {
            return;
        }

        await delay(waitMilliseconds);
    }
}

export async function setRiotRateLimitCooldown(
    routingValue: string,
    retryAfterSeconds: number
): Promise<Date> {
    const normalizedRoutingValue = normalizeRoutingValue(routingValue);

    if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 0) {
        throw new Error('Riot retry delay is invalid.');
    }

    return withDatabaseTransaction(async client => {
        await client.query(`
            INSERT INTO riot_rate_limits (
                routing_value,
                window_seconds,
                request_limit
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (routing_value, window_seconds) DO NOTHING
        `, [
            normalizedRoutingValue,
            cooldownRateLimit.windowSeconds,
            cooldownRateLimit.requestLimit,
        ]);

        const result = await client.query<RiotCooldownRow>(`
            UPDATE riot_rate_limits
            SET
                request_count = request_limit,
                window_started_at = GREATEST(
                    CASE
                        WHEN request_count >= request_limit
                        THEN window_started_at
                            + (window_seconds * INTERVAL '1 second')
                        ELSE clock_timestamp()
                    END,
                    clock_timestamp() + ($3 * INTERVAL '1 second')
                ) - (window_seconds * INTERVAL '1 second'),
                updated_at = clock_timestamp()
            WHERE routing_value = $1
                AND window_seconds = $2
            RETURNING
                window_started_at
                    + (window_seconds * INTERVAL '1 second') AS cooldown_until
        `, [
            normalizedRoutingValue,
            cooldownRateLimit.windowSeconds,
            retryAfterSeconds,
        ]);

        if (
            result.rows.length !== 1
            || !isValidDate(result.rows[0].cooldown_until)
        ) {
            throw new Error('Riot rate limit cooldown could not be stored.');
        }

        return result.rows[0].cooldown_until;
    });
}
