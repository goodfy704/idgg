export type RiotAccount = {
    puuid: string;
};

export type SummonerData = {
    puuid: string;
    profileIconId: number;
    summonerLevel: number;
};

export type LeagueEntry = {
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
};

export type RuneStyle = {
    style: number;
    selections: {
        perk: number;
    }[];
};

export type MatchParticipant = {
    puuid: string;
    championName: string;
    riotIdGameName: string;
    riotIdTagline: string;
    summoner1Id: number;
    summoner2Id: number;
    kills: number;
    deaths: number;
    assists: number;
    totalMinionsKilled: number;
    neutralMinionsKilled: number;
    timePlayed: number;
    win: boolean;
    item0: number;
    item1: number;
    item2: number;
    item3: number;
    item4: number;
    item5: number;
    item6: number;
    perks: {
        styles: RuneStyle[];
    };
};

export type MatchData = {
    metadata: {
        matchId: string;
    };
    info: {
        gameDuration: number;
        gameMode: string;
        queueId: number;
        participants: MatchParticipant[];
    };
};

export type PlayerReport = {
    summoner: SummonerData;
    league: LeagueEntry[];
    games: MatchData[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
);

export const isRiotAccount = (value: unknown): value is RiotAccount => (
    isRecord(value)
    && typeof value.puuid === 'string'
    && value.puuid.length > 0
);

export const isSummonerData = (value: unknown): value is SummonerData => (
    isRecord(value)
    && typeof value.puuid === 'string'
    && value.puuid.length > 0
    && typeof value.profileIconId === 'number'
    && typeof value.summonerLevel === 'number'
);

export const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value)
    && value.every(item => typeof item === 'string' && item.length > 0)
);

const isLeagueEntry = (value: unknown): value is LeagueEntry => (
    isRecord(value)
    && typeof value.queueType === 'string'
    && typeof value.tier === 'string'
    && typeof value.rank === 'string'
    && typeof value.leaguePoints === 'number'
    && typeof value.wins === 'number'
    && typeof value.losses === 'number'
);

export const isLeagueEntries = (value: unknown): value is LeagueEntry[] => (
    Array.isArray(value) && value.every(isLeagueEntry)
);

const isRuneStyle = (value: unknown): value is RuneStyle => {
    if (!isRecord(value) || typeof value.style !== 'number' || !Array.isArray(value.selections)) {
        return false;
    }

    return value.selections.every(selection => (
        isRecord(selection) && typeof selection.perk === 'number'
    ));
};

const isMatchParticipant = (value: unknown): value is MatchParticipant => {
    if (!isRecord(value)) {
        return false;
    }

    const numberFields = [
        'summoner1Id', 'summoner2Id', 'kills', 'deaths', 'assists',
        'totalMinionsKilled', 'neutralMinionsKilled', 'timePlayed',
        'item0', 'item1', 'item2', 'item3', 'item4', 'item5', 'item6',
    ];

    return typeof value.puuid === 'string'
        && value.puuid.length > 0
        && typeof value.championName === 'string'
        && typeof value.riotIdGameName === 'string'
        && typeof value.riotIdTagline === 'string'
        && typeof value.win === 'boolean'
        && numberFields.every(field => typeof value[field] === 'number')
        && isRecord(value.perks)
        && Array.isArray(value.perks.styles)
        && value.perks.styles.every(isRuneStyle);
};

export const isMatchData = (value: unknown): value is MatchData => {
    if (!isRecord(value) || !isRecord(value.metadata) || !isRecord(value.info)) {
        return false;
    }

    return typeof value.metadata.matchId === 'string'
        && value.metadata.matchId.length > 0
        && typeof value.info.gameDuration === 'number'
        && typeof value.info.gameMode === 'string'
        && typeof value.info.queueId === 'number'
        && Array.isArray(value.info.participants)
        && value.info.participants.every(isMatchParticipant);
};

export const isPlayerReport = (value: unknown): value is PlayerReport => (
    isRecord(value)
    && isSummonerData(value.summoner)
    && isLeagueEntries(value.league)
    && Array.isArray(value.games)
    && value.games.every(isMatchData)
);
