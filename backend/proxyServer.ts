import 'dotenv/config';
import axios, { type AxiosResponse } from 'axios';
import Bottleneck from 'bottleneck';

type HttpRequest = {
    query: Record<string, unknown>;
};

type HttpResponse = {
    status: (statusCode: number) => HttpResponse;
    send: (body: unknown) => HttpResponse;
    json: (body: unknown) => HttpResponse;
    write: (body: string) => boolean;
    end: () => void;
};

type RequestHandler = (request: HttpRequest, response: HttpResponse) => unknown;

type ExpressApplication = {
    use: (middleware: unknown) => void;
    listen: (port: number, callback: () => void) => void;
    get: (path: string, handler: RequestHandler) => void;
};

type ExpressFactory = () => ExpressApplication;
type CorsFactory = () => unknown;

type RiotAccount = {
    puuid: string;
};

type SummonerLookup = {
    id?: string;
};

type SummonerLocation = {
    summonerID: string | null;
    subRegion: string | null;
};

type MatchParticipant = {
    puuid: string;
    championName: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
};

type MatchData = {
    info: {
        participants: MatchParticipant[];
    };
};

type ChampionTotals = {
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isRiotAccount = (value: unknown): value is RiotAccount => (
    isRecord(value) && typeof value.puuid === 'string'
);

const isSummonerLookup = (value: unknown): value is SummonerLookup => (
    isRecord(value) && (value.id === undefined || typeof value.id === 'string')
);

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every(item => typeof item === 'string')
);

const isMatchParticipant = (value: unknown): value is MatchParticipant => (
    isRecord(value)
    && typeof value.puuid === 'string'
    && typeof value.championName === 'string'
    && typeof value.win === 'boolean'
    && typeof value.kills === 'number'
    && typeof value.deaths === 'number'
    && typeof value.assists === 'number'
);

const isMatchData = (value: unknown): value is MatchData => (
    isRecord(value)
    && isRecord(value.info)
    && Array.isArray(value.info.participants)
    && value.info.participants.every(isMatchParticipant)
);

const express: ExpressFactory = require('express');
const cors: CorsFactory = require('cors');
const app = express();

app.use(cors());

const limiter = new Bottleneck({
    minTime: 50,
});


const riotApiKey = process.env.RIOT_API_KEY?.trim();

if (!riotApiKey) {
    throw new Error('RIOT_API_KEY environment variable is required.');
}

const riotClient = axios.create({
    headers: {
        'X-Riot-Token': riotApiKey,
    },
});

app.listen(4000, function () {
    console.log("Server started on port 4000");
});

const subRegions = ['br1','euw1', 'eun1', 'jp1','kr','la1','la2','me1','na1','oc1','ph2','ru','sg2','th2','tr1','tw2','vn2'];
const regionToSubRegionMap: Record<string, string[]> = {
    'europe': ['euw1', 'eun1', 'ru', 'tr1', 'me1'],
    'americas': ['na1', 'la1', 'la2', 'br1'],
    'asia': ['kr', 'jp1', 'sg2', 'th2', 'tw2', 'vn2'],
    'esports': ['oc1', 'ph2']
};

async function fetchWithRetry(url: string, res?: HttpResponse): Promise<AxiosResponse<unknown>> {
    try {
        return await limiter.schedule(() => riotClient.get<unknown>(url));
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            const retryAfterHeader = error.response.headers['retry-after'];
            const parsedRetryAfter = Number(retryAfterHeader);
            const retryAfter = Number.isFinite(parsedRetryAfter) ? parsedRetryAfter : 120;

            if (res) {
                res.status(429).send({ message: 'Rate limit exceeded. Retrying...', retryAfter });
            }

            console.log(`Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            return fetchWithRetry(url, res);
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching data: ${message}`);
        throw error;
    }
}

async function getPlayerPUUID(playerName: string, playerTag: string): Promise<string> {
    const apiUrl = "https://europe.api.riotgames.com" + "/riot/account/v1/accounts/by-riot-id/" + playerName + "/" + playerTag;
    const response = await riotClient.get<unknown>(apiUrl);

    if (!isRiotAccount(response.data)) {
        throw new Error('Riot account response is invalid.');
    }

    console.log(response.data);
    return response.data.puuid;
}

async function getSummonerID(PUUID: string): Promise<SummonerLocation> {
    for (let subRegion of subRegions) {
        try {
            const apiUrl = `https://${subRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${PUUID}`;
            const response = await riotClient.get<unknown>(apiUrl);

            if (isSummonerLookup(response.data) && response.data.id) {
                console.log(`Summoner found: ${response.data.id}, subRegion: ${subRegion}`);
                return { summonerID: response.data.id, subRegion };
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';

            if (axios.isAxiosError(err) && err.response?.status === 404) {
                console.error(`Summoner not found in ${subRegion}: ${message}`);
            } else {
                console.error(`Error fetching summoner from ${subRegion}: ${message}`);
            }
            continue;
        }
    }
    console.error('Summoner not found in any subRegion.');
    return { summonerID: null, subRegion: null };
}

app.get('/past5Games', async (req, res) => {
    const userInput = req.query.userInput;

    if (typeof userInput !== 'string' || userInput.length === 0) {
        return res.status(400).json({ message: 'userInput is required.' });
    }

    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    const PUUID = await getPlayerPUUID(username, tag);

    const { summonerID, subRegion } = await getSummonerID(PUUID);

    if (!summonerID || !subRegion) {
        return res.status(404).json({ message: 'summonerID and subRegion bb bb' });
    }
    const mainRegion = Object.keys(regionToSubRegionMap).find(region =>
        regionToSubRegionMap[region].includes(subRegion)
    );

    if (!mainRegion) {
        return res.status(400).json({ message: 'Main region could not be determined.' });
    }
    console.log(mainRegion);

    const API_CALL = `https://${mainRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${PUUID}/ids`;

    const gameIDsResponse = await fetchWithRetry(API_CALL, res);

    if (!isStringArray(gameIDsResponse.data)) {
        throw new Error('Riot match ID response is invalid.');
    }

    const gameIDs = gameIDsResponse.data;

    const matchDataArray: unknown[] = [];
    for (let i = 0; i < gameIDs.length-10; i++) {
        const matchID = gameIDs[i];
        const matchIDAPI = `https://${mainRegion}.api.riotgames.com/lol/match/v5/matches/${matchID}`;
        const matchResponse = await fetchWithRetry(matchIDAPI, res);
        matchDataArray.push(matchResponse.data);
    }

    res.json(matchDataArray);
});

app.get('/summoner', async (req, res) => {
    const userInput = req.query.userInput;

    if (typeof userInput !== 'string' || userInput.length === 0) {
        return res.status(400).json({ message: 'userInput is required.' });
    }

    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];

    const PUUID = await getPlayerPUUID(username, tag);
    const { summonerID, subRegion } = await getSummonerID(PUUID);

    if (!summonerID || !subRegion) {
        return res.status(404).json({ message: 'summonerID and subRegion bb bb' });
    }
    const API_CALL = `https://${subRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${PUUID}`;

    const summonerResponse = await riotClient.get<unknown>(API_CALL);

    res.json(summonerResponse.data);
});

app.get('/league', async (req, res) => {
    const userInput = req.query.userInput;

    if (typeof userInput !== 'string' || userInput.length === 0) {
        return res.status(400).json({ message: 'userInput is required.' });
    }

    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    const PUUID = await getPlayerPUUID(username, tag);

    const { summonerID, subRegion } = await getSummonerID(PUUID);

    if (!summonerID || !subRegion) {
        return res.status(404).json({ message: 'summonerID and subRegion bb bb' });
    }
    const API_CALL = `https://${subRegion}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerID}`;

    const leagueResponse = await riotClient.get<unknown>(API_CALL);

    res.json(leagueResponse.data);
});

app.get('/championStats', async (req, res) => {
    const userInput = req.query.userInput;

    if (typeof userInput !== 'string' || userInput.length === 0) {
        return res.status(400).json({ message: 'userInput is required.' });
    }

    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    const PUUID = await getPlayerPUUID(username, tag);
    const API_CALL = "https://europe.api.riotgames.com/" + "lol/match/v5/matches/by-puuid/" + PUUID + "/ids?start=0&count=25";

    let gameIDs: string[];

    try {
        const gameIDsResponse = await fetchWithRetry(API_CALL, res);

        if (!isStringArray(gameIDsResponse.data)) {
            throw new Error('Riot match ID response is invalid.');
        }

        gameIDs = gameIDsResponse.data;
    } catch (err: unknown) {
        console.error("Error fetching match IDs:", err);
        res.status(500).send("Error fetching match IDs.");
        return;
    }

    if (!gameIDs.length) {
        return res.status(200).json({ message: "No games found." });
    }

    const champStats: Record<string, ChampionTotals> = {};

    const processBatch = async (batch: string[]) => {
        for (const matchID of batch) {
            const matchAPI = `https://europe.api.riotgames.com/lol/match/v5/matches/${matchID}`;
            const matchResponse = await fetchWithRetry(matchAPI);

            if (!isMatchData(matchResponse.data)) {
                throw new Error('Riot match response is invalid.');
            }

            const participant = matchResponse.data.info.participants.find((p) => p.puuid === PUUID);

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
});
