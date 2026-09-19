import 'dotenv/config';
import axios from 'axios';

import {
    setRiotRateLimitCooldown,
    waitForRiotRateLimit,
} from './rateLimitCoordinator';

export class RiotRequestError extends Error {
    readonly statusCode: number | null;
    readonly retryAfterSeconds: number | null;

    constructor(statusCode: number | null, retryAfterSeconds: number | null) {
        super('Riot API request failed.');
        this.name = 'RiotRequestError';
        this.statusCode = statusCode;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export class RiotResponseError extends Error {
    constructor() {
        super('Riot API returned an invalid response.');
        this.name = 'RiotResponseError';
    }
}

const maxRiotRequestAttempts = 3;
const defaultRetryAfterSeconds = 1;
const maximumRetryAfterSeconds = 120;

const riotApiKey = process.env.RIOT_API_KEY?.trim();

if (!riotApiKey) {
    throw new Error('RIOT_API_KEY environment variable is required.');
}

const riotClient = axios.create({
    headers: {
        'X-Riot-Token': riotApiKey,
    },
    timeout: 15000,
});

const getRetryAfterSeconds = (headerValue: unknown): number => {
    const parsedSeconds = Number(headerValue);

    if (!Number.isFinite(parsedSeconds) || parsedSeconds < 0) {
        return defaultRetryAfterSeconds;
    }

    return Math.min(Math.ceil(parsedSeconds), maximumRetryAfterSeconds);
};

const getRiotRoutingValue = (url: string): string => {
    const parsedUrl = new URL(url);
    const hostMatch = /^([a-z0-9]+)\.api\.riotgames\.com$/i.exec(parsedUrl.hostname);

    if (parsedUrl.protocol !== 'https:' || !hostMatch) {
        throw new Error('Riot API URL is invalid.');
    }

    return hostMatch[1];
};

export async function requestRiot(url: string): Promise<unknown> {
    const routingValue = getRiotRoutingValue(url);

    for (let attempt = 1; attempt <= maxRiotRequestAttempts; attempt += 1) {
        await waitForRiotRateLimit(routingValue);

        try {
            const response = await riotClient.get<unknown>(url);

            return response.data;
        } catch (error: unknown) {
            if (!axios.isAxiosError(error)) {
                throw new RiotRequestError(null, null);
            }

            const statusCode = error.response?.status ?? null;
            const retryAfterSeconds = statusCode === 429
                ? getRetryAfterSeconds(error.response?.headers['retry-after'])
                : null;

            if (statusCode === 429 && retryAfterSeconds !== null) {
                await setRiotRateLimitCooldown(routingValue, retryAfterSeconds);

                if (attempt < maxRiotRequestAttempts) {
                    continue;
                }
            }

            throw new RiotRequestError(statusCode, retryAfterSeconds);
        }
    }

    throw new RiotRequestError(null, null);
}
