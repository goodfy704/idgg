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
    participantId: number;
    teamPosition: string;
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
        gameStartTimestamp: number;
        gameVersion: string;
        gameDuration: number;
        gameMode: string;
        queueId: number;
        participants: MatchParticipant[];
    };
};

export type TimelinePosition = {
    x: number;
    y: number;
};

export type TimelineParticipantFrame = {
    participantId: number;
    currentGold: number;
    totalGold: number;
    level: number;
    xp: number;
    minionsKilled: number;
    jungleMinionsKilled: number;
    position?: TimelinePosition;
};

export type TimelineParticipant = {
    participantId: number;
    puuid: string;
};

export type TimelineEvent = {
    timestamp: number;
    type: string;
    [field: string]: unknown;
};

export type ChampionKillTimelineEvent = TimelineEvent & {
    type: 'CHAMPION_KILL';
    victimId: number;
};

export type TimelineFrame = {
    timestamp: number;
    participantFrames: Record<string, TimelineParticipantFrame>;
    events: TimelineEvent[];
};

export type MatchTimeline = {
    metadata: {
        dataVersion: string;
        matchId: string;
        participants: string[];
    };
    info: {
        frameInterval: number;
        participants: TimelineParticipant[];
        frames: TimelineFrame[];
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

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isPositiveInteger = (value: unknown): value is number => (
    isFiniteNumber(value) && Number.isInteger(value) && value > 0
);

const isNonNegativeInteger = (value: unknown): value is number => (
    isFiniteNumber(value) && Number.isInteger(value) && value >= 0
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
        && isPositiveInteger(value.participantId)
        && typeof value.teamPosition === 'string'
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
        && isPositiveInteger(value.info.gameStartTimestamp)
        && typeof value.info.gameVersion === 'string'
        && value.info.gameVersion.length > 0
        && typeof value.info.gameDuration === 'number'
        && typeof value.info.gameMode === 'string'
        && typeof value.info.queueId === 'number'
        && Array.isArray(value.info.participants)
        && value.info.participants.every(isMatchParticipant);
};

const isTimelinePosition = (value: unknown): value is TimelinePosition => (
    isRecord(value)
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
);

const isTimelineParticipantFrame = (
    value: unknown
): value is TimelineParticipantFrame => (
    isRecord(value)
    && isPositiveInteger(value.participantId)
    && isNonNegativeInteger(value.currentGold)
    && isNonNegativeInteger(value.totalGold)
    && isPositiveInteger(value.level)
    && isNonNegativeInteger(value.xp)
    && isNonNegativeInteger(value.minionsKilled)
    && isNonNegativeInteger(value.jungleMinionsKilled)
    && (value.position === undefined || isTimelinePosition(value.position))
);

const isTimelineParticipant = (value: unknown): value is TimelineParticipant => (
    isRecord(value)
    && isPositiveInteger(value.participantId)
    && typeof value.puuid === 'string'
    && value.puuid.length > 0
);

const isTimelineParticipants = (
    value: unknown
): value is TimelineParticipant[] => {
    if (!Array.isArray(value) || value.length === 0 || !value.every(isTimelineParticipant)) {
        return false;
    }

    const participantIds = new Set(value.map(participant => participant.participantId));
    const participantPUUIDs = new Set(value.map(participant => participant.puuid));

    return participantIds.size === value.length
        && participantPUUIDs.size === value.length;
};

export const isChampionKillTimelineEvent = (
    value: unknown
): value is ChampionKillTimelineEvent => (
    isRecord(value)
    && value.type === 'CHAMPION_KILL'
    && isNonNegativeInteger(value.timestamp)
    && isPositiveInteger(value.victimId)
);

const isTimelineEvent = (value: unknown): value is TimelineEvent => {
    if (
        !isRecord(value)
        || !isNonNegativeInteger(value.timestamp)
        || typeof value.type !== 'string'
        || value.type.length === 0
    ) {
        return false;
    }

    return value.type !== 'CHAMPION_KILL'
        || isChampionKillTimelineEvent(value);
};

const isTimelineFrame = (value: unknown): value is TimelineFrame => {
    if (
        !isRecord(value)
        || !isNonNegativeInteger(value.timestamp)
        || !isRecord(value.participantFrames)
        || !Array.isArray(value.events)
    ) {
        return false;
    }

    return Object.entries(value.participantFrames).every(([participantId, frame]) => (
        isTimelineParticipantFrame(frame)
        && participantId === `${frame.participantId}`
    ))
        && value.events.every(isTimelineEvent);
};

export const isMatchTimeline = (value: unknown): value is MatchTimeline => {
    if (!isRecord(value) || !isRecord(value.metadata) || !isRecord(value.info)) {
        return false;
    }

    const metadataParticipants = value.metadata.participants;
    const timelineParticipants = value.info.participants;

    if (
        typeof value.metadata.dataVersion !== 'string'
        || value.metadata.dataVersion.length === 0
        || typeof value.metadata.matchId !== 'string'
        || value.metadata.matchId.length === 0
        || !isStringArray(metadataParticipants)
        || new Set(metadataParticipants).size !== metadataParticipants.length
        || !isPositiveInteger(value.info.frameInterval)
        || !isTimelineParticipants(timelineParticipants)
        || !Array.isArray(value.info.frames)
        || !value.info.frames.every(isTimelineFrame)
    ) {
        return false;
    }

    const metadataParticipantPUUIDs = new Set(metadataParticipants);

    return timelineParticipants.length === metadataParticipants.length
        && timelineParticipants.every(participant => (
            metadataParticipantPUUIDs.has(participant.puuid)
        ));
};

export const isPlayerReport = (value: unknown): value is PlayerReport => (
    isRecord(value)
    && isSummonerData(value.summoner)
    && isLeagueEntries(value.league)
    && Array.isArray(value.games)
    && value.games.every(isMatchData)
);
