import 'dotenv/config';
import axios from 'axios';
import Bottleneck from 'bottleneck';

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
let riotCooldownUntil = 0;

const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 50,
    reservoir: 100,
    reservoirRefreshAmount: 100,
    reservoirRefreshInterval: 120000,
});

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

const waitForRiotCooldown = async () => {
    const waitTime = riotCooldownUntil - Date.now();

    if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
};

export async function requestRiot(url: string): Promise<unknown> {
    for (let attempt = 1; attempt <= maxRiotRequestAttempts; attempt += 1) {
        try {
            const response = await limiter.schedule(async () => {
                await waitForRiotCooldown();
                return riotClient.get<unknown>(url);
            });

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
                riotCooldownUntil = Math.max(
                    riotCooldownUntil,
                    Date.now() + retryAfterSeconds * 1000
                );

                if (attempt < maxRiotRequestAttempts) {
                    continue;
                }
            }

            throw new RiotRequestError(statusCode, retryAfterSeconds);
        }
    }

    throw new RiotRequestError(null, null);
}
