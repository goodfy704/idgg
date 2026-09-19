import type { Server } from 'node:http';

import { closeDatabase, verifyDatabaseConnection } from './database';
import { runMigrations } from './migrate';
import { getCachedReport, saveCachedReport } from './reportRepository';
import { requestRiot, RiotRequestError, RiotResponseError } from './riotClient';
import {
    isLeagueEntries,
    isMatchData,
    isPlayerReport,
    isRiotAccount,
    isStringArray,
    isSummonerData,
    type LeagueEntry,
    type MatchData,
    type PlayerReport,
    type SummonerData,
} from './riotSchemas';

type HttpRequest = {
    query: Record<string, unknown>;
};

type HttpResponse = {
    headersSent: boolean;
    writableEnded: boolean;
    status: (statusCode: number) => HttpResponse;
    setHeader: (name: string, value: string) => void;
    send: (body: unknown) => HttpResponse;
    json: (body: unknown) => HttpResponse;
    write: (body: string) => boolean;
    end: () => void;
};

type RequestHandler = (request: HttpRequest, response: HttpResponse) => unknown;
type AsyncRequestHandler = (request: HttpRequest, response: HttpResponse) => Promise<unknown>;

type ExpressApplication = {
    listen: (port: number, callback: () => void) => Server;
    get: (path: string, handler: RequestHandler) => void;
};

type ExpressFactory = () => ExpressApplication;

type ChampionTotals = {
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
};

type RegionalRoute = 'americas' | 'asia' | 'europe' | 'sea';

const recentMatchCount = 10;

const platforms = [
    'br1', 'eun1', 'euw1', 'jp1', 'kr', 'la1', 'la2', 'me1', 'na1',
    'oc1', 'ph2', 'ru', 'sg2', 'th2', 'tr1', 'tw2', 'vn2',
] as const;

type Platform = typeof platforms[number];

const platformToRegionalRoute: Record<Platform, RegionalRoute> = {
    br1: 'americas',
    eun1: 'europe',
    euw1: 'europe',
    jp1: 'asia',
    kr: 'asia',
    la1: 'americas',
    la2: 'americas',
    me1: 'europe',
    na1: 'americas',
    oc1: 'sea',
    ph2: 'sea',
    ru: 'europe',
    sg2: 'sea',
    th2: 'sea',
    tr1: 'europe',
    tw2: 'sea',
    vn2: 'sea',
};

type PlayerQuery = {
    gameName: string;
    tagLine: string;
};

type PlayerLocation = {
    PUUID: string;
    platform: Platform;
    regionalRoute: RegionalRoute;
    summoner: SummonerData;
};

const isValidGameName = (value: string) => {
    const length = Array.from(value).length;
    return length >= 3 && length <= 16 && !value.includes('#');
};

const isValidTagLine = (value: string) => /^[\p{L}\p{N}]{3,5}$/u.test(value);

const getPlayerQuery = (request: HttpRequest): PlayerQuery | null => {
    const gameName = request.query.gameName;
    const tagLine = request.query.tagLine;

    if (typeof gameName !== 'string' || typeof tagLine !== 'string') {
        return null;
    }

    const normalizedGameName = gameName.trim();
    const normalizedTagLine = tagLine.trim();

    if (
        !isValidGameName(normalizedGameName)
        || !isValidTagLine(normalizedTagLine)
    ) {
        return null;
    }

    return {
        gameName: normalizedGameName,
        tagLine: normalizedTagLine,
    };
};

const playerLocationLookups = new Map<string, Promise<PlayerLocation | null>>();

const express: ExpressFactory = require('express');
const app = express();
let server: Server | null = null;
let shuttingDown = false;

const sendRouteError = (response: HttpResponse, error: unknown) => {
    if (response.headersSent) {
        if (!response.writableEnded) {
            response.end();
        }
        return;
    }

    if (error instanceof RiotResponseError) {
        console.error(error.message);
        response.status(502).json({ message: 'Riot API returned an invalid response.' });
        return;
    }

    if (error instanceof RiotRequestError) {
        console.error(`Riot API request failed with status ${error.statusCode ?? 'unavailable'}.`);

        if (error.statusCode === 404) {
            response.status(404).json({ message: 'Riot data was not found.' });
            return;
        }

        if (error.statusCode === 429) {
            if (error.retryAfterSeconds !== null) {
                response.setHeader('Retry-After', `${error.retryAfterSeconds}`);
            }

            response.status(429).json({ message: 'Riot API rate limit exceeded.' });
            return;
        }

        if (
            error.statusCode === 401
            || error.statusCode === 403
            || (error.statusCode !== null && error.statusCode >= 500)
        ) {
            response.status(503).json({ message: 'Riot API is unavailable.' });
            return;
        }

        response.status(502).json({ message: 'Riot API request failed.' });
        return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Unexpected server error: ${message}`);
    response.status(500).json({ message: 'Unexpected server error.' });
};

const withErrorBoundary = (handler: AsyncRequestHandler): RequestHandler => (
    (request, response) => {
        void handler(request, response).catch(error => sendRouteError(response, error));
    }
);

async function getPlayerPUUID(
    playerName: string,
    playerTag: string
): Promise<string> {
    const encodedPlayerName = encodeURIComponent(playerName);
    const encodedPlayerTag = encodeURIComponent(playerTag);
    const apiUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedPlayerName}/${encodedPlayerTag}`;
    const data = await requestRiot(apiUrl);

    if (!isRiotAccount(data)) {
        throw new RiotResponseError();
    }

    return data.puuid;
}

async function lookupPlayerLocation(gameName: string, tagLine: string): Promise<PlayerLocation | null> {
    const PUUID = await getPlayerPUUID(gameName, tagLine);
    const encodedPUUID = encodeURIComponent(PUUID);

    for (const platform of platforms) {
        try {
            const apiUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodedPUUID}`;
            const data = await requestRiot(apiUrl);

            if (!isSummonerData(data) || data.puuid !== PUUID) {
                throw new RiotResponseError();
            }

            return {
                PUUID,
                platform,
                regionalRoute: platformToRegionalRoute[platform],
                summoner: data,
            };
        } catch (error: unknown) {
            if (error instanceof RiotRequestError && error.statusCode === 404) {
                continue;
            }

            throw error;
        }
    }

    return null;
}

async function getPlayerLocation(gameName: string, tagLine: string): Promise<PlayerLocation | null> {
    const lookupKey = `${gameName}#${tagLine}`;
    const activeLookup = playerLocationLookups.get(lookupKey);

    if (activeLookup) {
        return activeLookup;
    }

    const lookup = lookupPlayerLocation(gameName, tagLine);
    playerLocationLookups.set(lookupKey, lookup);

    try {
        return await lookup;
    } finally {
        if (playerLocationLookups.get(lookupKey) === lookup) {
            playerLocationLookups.delete(lookupKey);
        }
    }
}

async function getRecentMatches(playerLocation: PlayerLocation): Promise<MatchData[]> {
    const { PUUID, regionalRoute } = playerLocation;
    const encodedPUUID = encodeURIComponent(PUUID);
    const API_CALL = `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodedPUUID}/ids?start=0&count=${recentMatchCount}`;
    const gameIDsData = await requestRiot(API_CALL);

    if (!isStringArray(gameIDsData) || gameIDsData.length > recentMatchCount) {
        throw new RiotResponseError();
    }

    const matchDataArray: MatchData[] = [];
    for (const matchID of gameIDsData) {
        const matchIDAPI = `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchID)}`;
        const matchData = await requestRiot(matchIDAPI);

        if (!isMatchData(matchData) || matchData.metadata.matchId !== matchID) {
            throw new RiotResponseError();
        }

        matchDataArray.push(matchData);
    }

    return matchDataArray;
}

async function getLeagueEntries(playerLocation: PlayerLocation): Promise<LeagueEntry[]> {
    const API_CALL = `https://${playerLocation.platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(playerLocation.PUUID)}`;
    const leagueEntries = await requestRiot(API_CALL);

    if (!isLeagueEntries(leagueEntries)) {
        throw new RiotResponseError();
    }

    return leagueEntries;
}

app.get('/api/report', withErrorBoundary(async (req, res) => {
    const playerQuery = getPlayerQuery(req);

    if (!playerQuery) {
        return res.status(400).json({ message: 'gameName and tagLine are required and must be valid.' });
    }

    const cachedReport = await getCachedReport(
        playerQuery.gameName,
        playerQuery.tagLine
    );

    if (cachedReport) {
        return res.json(cachedReport.report);
    }

    const playerLocation = await getPlayerLocation(
        playerQuery.gameName,
        playerQuery.tagLine
    );

    if (!playerLocation) {
        return res.status(404).json({ message: 'Player platform could not be found.' });
    }

    const [games, league] = await Promise.all([
        getRecentMatches(playerLocation),
        getLeagueEntries(playerLocation),
    ]);

    const report: PlayerReport = {
        summoner: playerLocation.summoner,
        league,
        games,
    };

    if (!isPlayerReport(report)) {
        throw new RiotResponseError();
    }

    await saveCachedReport({
        gameName: playerQuery.gameName,
        tagLine: playerQuery.tagLine,
        platform: playerLocation.platform,
        regionalRoute: playerLocation.regionalRoute,
        report,
    });

    res.json(report);
}));

app.get('/championStats', withErrorBoundary(async (req, res) => {
    const playerQuery = getPlayerQuery(req);

    if (!playerQuery) {
        return res.status(400).json({ message: 'gameName and tagLine are required and must be valid.' });
    }

    const playerLocation = await getPlayerLocation(
        playerQuery.gameName,
        playerQuery.tagLine
    );

    if (!playerLocation) {
        return res.status(404).json({ message: 'Player platform could not be found.' });
    }

    const { PUUID, regionalRoute } = playerLocation;
    const encodedPUUID = encodeURIComponent(PUUID);
    const API_CALL = `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodedPUUID}/ids?start=0&count=25`;
    const gameIDsData = await requestRiot(API_CALL);

    if (!isStringArray(gameIDsData)) {
        throw new RiotResponseError();
    }

    const gameIDs = gameIDsData;

    if (!gameIDs.length) {
        return res.status(200).json({ message: "No games found." });
    }

    const champStats: Record<string, ChampionTotals> = {};

    const processBatch = async (batch: string[]) => {
        for (const matchID of batch) {
            const matchAPI = `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchID)}`;
            const matchData = await requestRiot(matchAPI);

            if (!isMatchData(matchData)) {
                throw new RiotResponseError();
            }

            const participant = matchData.info.participants.find((p) => p.puuid === PUUID);

            if (participant) {
                const championName = participant.championName;

                if (!champStats[championName]) {
                    champStats[championName] = {
                        games: 0,
                        wins: 0,
                        kills: 0,
                        deaths: 0,
                        assists: 0,
                    };
                }
                const stats = champStats[championName];
                stats.games += 1;
                console.log(stats.games, championName);
                stats.wins += participant.win ? 1 : 0;
                stats.kills += participant.kills;
                stats.deaths += participant.deaths;
                stats.assists += participant.assists;
            }
        }
    };

    for (let i = 0; i < gameIDs.length; i += 12) {
        const batch = gameIDs.slice(i, i + 12);
        await processBatch(batch);

        const championsSorted = Object.entries(champStats)
            .map(([championName, stats]) => ({
                championName,
                games: stats.games,
                winRate: ((stats.wins / stats.games) * 100).toFixed(2),
                kda: ((stats.kills + stats.assists) / (stats.deaths || 1)).toFixed(2),
                kills: stats.kills,
                deaths: stats.deaths,
                assists: stats.assists,
            }))
            .sort((a, b) => b.games - a.games);

        res.write(JSON.stringify({ batchNumber: Math.ceil(i / 12) + 1, champions: championsSorted }));

        if (i + 12 < gameIDs.length) {
            await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
        }
    }

    res.end();
}));

const closeHttpServer = async (): Promise<void> => {
    const activeServer = server;

    if (!activeServer) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        activeServer.close(error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
    server = null;
};

const shutdown = async () => {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    try {
        await closeHttpServer();
        await closeDatabase();
    } catch {
        console.error('Server shutdown failed.');
        process.exitCode = 1;
    }
};

const startServer = async () => {
    try {
        await verifyDatabaseConnection();
        await runMigrations();
        server = app.listen(4000, function () {
            console.log('Server started on port 4000');
        });
    } catch {
        console.error('Database startup failed. Server was not started.');
        process.exitCode = 1;

        try {
            await closeDatabase();
        } catch {
            console.error('PostgreSQL pool shutdown failed.');
        }
    }
};

process.once('SIGINT', () => {
    void shutdown();
});

process.once('SIGTERM', () => {
    void shutdown();
});

void startServer();
