import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

import RankedSolo from './PlayerRank/rankedSoloAndFlex';
import type { LeagueEntry } from './PlayerRank/rankedSoloAndFlex';
import SummonerKeystones from './MatchHistory/summonerKeystones';
import SummonerItems from './MatchHistory/summonerItems';
import MatchTimeAndQueueType from './MatchHistory/matchTimeAndQueueType';
import MatchParticipants from './MatchHistory/matchParticipants';
import SummonerProfile from './summonerProfile';
import NotFoundPage from './NotFoundPage';
import SummonerMatchStats from './MatchHistory/summonerMatchStats';
import LastGamesStatistics from './PlayerRank/lastGamesStatistics';
import type { RecentGameStatistics } from './PlayerRank/lastGamesStatistics';

type RuneStyle = {
    style: number;
    selections: {
        perk: number;
    }[];
};

type Participant = {
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

type MatchData = {
    metadata: {
        matchId: string;
    };
    info: {
        gameDuration: number;
        gameMode: string;
        queueId: number;
        participants: Participant[];
    };
};

type Summoner = {
    puuid: string;
    profileIconId: number;
    summonerLevel: number;
};

type ChampionTotals = {
    gamesPlayed: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
};

const championsUrl = 'https://cdn.communitydragon.org/latest/champion/';
const summonerUrl = 'https://ddragon.leagueoflegends.com/cdn/15.1.1/img/spell/';
const runesUrl = 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/';
const itemUrl = 'https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/';

const isValidGameName = (value: string) => {
    const length = Array.from(value).length;
    return length >= 3 && length <= 16 && !value.includes('#');
};

const isValidTagLine = (value: string) => /^[\p{L}\p{N}]{3,5}$/u.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isRuneStyle = (value: unknown): value is RuneStyle => {
    if (!isRecord(value) || typeof value.style !== 'number' || !Array.isArray(value.selections)) {
        return false;
    }

    return value.selections.every(selection => (
        isRecord(selection) && typeof selection.perk === 'number'
    ));
};

const isParticipant = (value: unknown): value is Participant => {
    if (!isRecord(value)) {
        return false;
    }

    const numberFields = [
        'summoner1Id', 'summoner2Id', 'kills', 'deaths', 'assists',
        'totalMinionsKilled', 'neutralMinionsKilled', 'timePlayed',
        'item0', 'item1', 'item2', 'item3', 'item4', 'item5', 'item6',
    ];

    return typeof value.puuid === 'string'
        && typeof value.championName === 'string'
        && typeof value.riotIdGameName === 'string'
        && typeof value.riotIdTagline === 'string'
        && typeof value.win === 'boolean'
        && numberFields.every(field => typeof value[field] === 'number')
        && isRecord(value.perks)
        && Array.isArray(value.perks.styles)
        && value.perks.styles.every(isRuneStyle);
};

const isMatchData = (value: unknown): value is MatchData => {
    if (!isRecord(value) || !isRecord(value.metadata) || !isRecord(value.info)) {
        return false;
    }

    return typeof value.metadata.matchId === 'string'
        && typeof value.info.gameDuration === 'number'
        && typeof value.info.gameMode === 'string'
        && typeof value.info.queueId === 'number'
        && Array.isArray(value.info.participants)
        && value.info.participants.every(isParticipant);
};

const isSummoner = (value: unknown): value is Summoner => (
    isRecord(value)
    && typeof value.puuid === 'string'
    && typeof value.profileIconId === 'number'
    && typeof value.summonerLevel === 'number'
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

const arrangeLeagueEntries = (entries: LeagueEntry[]): (LeagueEntry | null)[] => {
    const rankedSolo = entries.find(entry => entry.queueType === 'RANKED_SOLO_5x5') ?? null;
    const rankedFlex = entries.find(entry => entry.queueType === 'RANKED_FLEX_SR') ?? null;
    return [rankedSolo, rankedFlex];
};

const calculateRecentGameStats = (
    gameList: MatchData[],
    summonerPUUID: string
): { championStats: Record<string, ChampionTotals>; aggregatedStats: RecentGameStatistics } => {
    const championStats: Record<string, ChampionTotals> = {};
    const totals = {
        gamesPlayed: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        totalMinionsKilled: 0,
        neutralMinionsKilled: 0,
        timePlayed: 0,
    };

    for (const game of gameList) {
        const player = game.info.participants.find(
            participant => participant.puuid === summonerPUUID
        );

        if (!player) {
            continue;
        }

        if (!Object.hasOwn(championStats, player.championName)) {
            championStats[player.championName] = {
                gamesPlayed: 0,
                wins: 0,
                kills: 0,
                deaths: 0,
                assists: 0,
            };
        }

        const champion = championStats[player.championName];
        champion.gamesPlayed += 1;
        champion.wins += player.win ? 1 : 0;
        champion.kills += player.kills;
        champion.deaths += player.deaths;
        champion.assists += player.assists;

        totals.gamesPlayed += 1;
        totals.wins += player.win ? 1 : 0;
        totals.kills += player.kills;
        totals.deaths += player.deaths;
        totals.assists += player.assists;
        totals.totalMinionsKilled += player.totalMinionsKilled;
        totals.neutralMinionsKilled += player.neutralMinionsKilled;
        totals.timePlayed += player.timePlayed;
    }

    if (totals.gamesPlayed === 0) {
        return {
            championStats,
            aggregatedStats: {
                gamesPlayed: 0,
                winRate: '0',
                kda: '0.00',
                avgKills: '0',
                avgDeaths: '0',
                avgAssists: '0',
                csPerMinute: '0.00',
            },
        };
    }

    const minutesPlayed = totals.timePlayed / 60;

    return {
        championStats,
        aggregatedStats: {
            gamesPlayed: totals.gamesPlayed,
            winRate: (totals.wins / totals.gamesPlayed * 100).toFixed(0),
            kda: ((totals.kills + totals.assists) / Math.max(1, totals.deaths)).toFixed(2),
            avgKills: (totals.kills / totals.gamesPlayed).toFixed(0),
            avgDeaths: (totals.deaths / totals.gamesPlayed).toFixed(0),
            avgAssists: (totals.assists / totals.gamesPlayed).toFixed(0),
            csPerMinute: minutesPlayed > 0
                ? ((totals.totalMinionsKilled + totals.neutralMinionsKilled) / minutesPlayed).toFixed(2)
                : '0.00',
        },
    };
};

const getMostPlayedChampion = (championStats: Record<string, ChampionTotals>) => {
    let mostPlayedChampion: (ChampionTotals & { championName: string }) | null = null;

    for (const [championName, stats] of Object.entries(championStats)) {
        if (!mostPlayedChampion || stats.gamesPlayed > mostPlayedChampion.gamesPlayed) {
            mostPlayedChampion = { championName, ...stats };
        }
    }

    return mostPlayedChampion;
};

function PlayerPage() {
    const [gameList, setGameList] = useState<MatchData[]>([]);
    const [summoner, setSummoner] = useState<Summoner | null>(null);
    const [league, setLeague] = useState<(LeagueEntry | null)[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { gameName, tagLine } = useParams<{
        gameName: string;
        tagLine: string;
    }>();
    const playerName = gameName?.trim() ?? '';
    const playerTagLine = tagLine?.trim() ?? '';

    useEffect(() => {
        if (!isValidGameName(playerName) || !isValidTagLine(playerTagLine)) {
            setLoading(false);
            navigate('/notFound');
            return;
        }

        const controller = new AbortController();
        let active = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                const requestConfig = {
                    params: {
                        gameName: playerName,
                        tagLine: playerTagLine,
                    },
                    signal: controller.signal,
                };
                const [gamesResponse, summonerResponse, leagueResponse] = await Promise.all([
                    axios.get<unknown>('http://localhost:4000/past5Games', requestConfig),
                    axios.get<unknown>('http://localhost:4000/summoner', requestConfig),
                    axios.get<unknown>('http://localhost:4000/league', requestConfig),
                ]);

                if (!active) {
                    return;
                }

                if (!isSummoner(summonerResponse.data)) {
                    navigate('/notFound');
                    return;
                }

                const games = Array.isArray(gamesResponse.data)
                    ? gamesResponse.data.filter(isMatchData)
                    : [];
                const leagueEntries = Array.isArray(leagueResponse.data)
                    ? leagueResponse.data.filter(isLeagueEntry)
                    : [];

                setSummoner(summonerResponse.data);
                setGameList(games);
                setLeague(arrangeLeagueEntries(leagueEntries));
            } catch (error: unknown) {
                if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
                    return;
                }

                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    navigate('/notFound');
                } else {
                    navigate('/tooManyRequests');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void fetchData();

        return () => {
            active = false;
            controller.abort();
        };
    }, [navigate, playerName, playerTagLine]);

    if (loading) {
        return (
            <div className="text-white w-screen text-center h-screen content-center text-4xl">
                <p>Loading...</p>
            </div>
        );
    }

    if (!summoner) {
        return <NotFoundPage />;
    }

    const { championStats, aggregatedStats } = calculateRecentGameStats(gameList, summoner.puuid);
    const mostPlayedChampion = getMostPlayedChampion(championStats);

    return (
        <div className="min-h-screen w-full text-white">
            <div className="w-full bg-linear-to-r from-darker-plume via-dark-plume to-darker-plume border-b-2 border-plume hover:drop-shadow-goldish">
                <div className="w-full max-w-7xl mx-auto px-4 py-8">
                    <SummonerProfile summoner={summoner} playerName={playerName} tagLine={playerTagLine} />
                </div>
            </div>
            <div className="w-full max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <div className="min-w-0 rounded-xl grid grid-cols-1 lg:grid-cols-5 bg-black-russian/35 border-2 border-dark-silver transition ease-in-out delay-150 drop-shadow-plume hover:drop-shadow-goldish overflow-hidden">
                    <div className="min-w-0 lg:col-span-3">
                        <RankedSolo league={league} />
                    </div>
                    <div className="min-w-0 lg:col-span-2">
                        <LastGamesStatistics gameList={aggregatedStats} />
                        {mostPlayedChampion && (
                            <div className="mt-4 px-4 pb-4">
                                <h3 className="text-lg text-center mb-5">Your most played champion</h3>
                                <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 items-start">
                                    <img
                                        className="w-20 h-20 object-cover"
                                        alt={mostPlayedChampion.championName}
                                        src={`${championsUrl}${mostPlayedChampion.championName}/square`}
                                    />
                                    <div className="min-w-0">
                                        <p>Games Played: {mostPlayedChampion.gamesPlayed}</p>
                                        <p>
                                            KDA: {(mostPlayedChampion.kills / mostPlayedChampion.gamesPlayed).toFixed(0)} / {(mostPlayedChampion.deaths / mostPlayedChampion.gamesPlayed).toFixed(0)} / {(mostPlayedChampion.assists / mostPlayedChampion.gamesPlayed).toFixed(0)}
                                        </p>
                                        <p>
                                            Win Rate: {(mostPlayedChampion.wins / mostPlayedChampion.gamesPlayed * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="min-w-0 w-full border-2 bg-black-russian/35 border-dark-silver rounded-xl drop-shadow-plume hover:drop-shadow-goldish transition ease-in-out delay-150 overflow-hidden">
                    {gameList.length > 0 ? gameList.map(gameData => {
                        const player = gameData.info.participants.find(
                            participant => participant.puuid === summoner.puuid
                        );

                        return (
                            <div
                                key={gameData.metadata.matchId}
                                className={`first:mt-4 mx-4 mb-4 min-w-0 grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] gap-4 transition ease-in-out delay-150 border-2 rounded-xl drop-shadow-plume hover:drop-shadow-goldish overflow-hidden ${player?.win ? 'from-green/5 via-green/5 via-5% to-transparent bg-linear-to-r' : 'from-red/5 via-5% to-transparent bg-linear-to-r'}`}
                            >
                                <div className="min-w-0 p-6">
                                    <MatchTimeAndQueueType gameData={gameData} />
                                </div>
                                <div className="min-w-0 py-4">
                                    <SummonerKeystones
                                        gameData={gameData}
                                        summoner={summoner}
                                        championsUrl={championsUrl}
                                        summonerUrl={summonerUrl}
                                        runesUrl={runesUrl}
                                    />
                                    <SummonerItems
                                        gameData={gameData}
                                        summoner={summoner}
                                        itemUrl={itemUrl}
                                    />
                                </div>
                                <div className="min-w-0 overflow-hidden py-4">
                                    <MatchParticipants gameData={gameData} championsUrl={championsUrl} />
                                </div>
                            </div>
                        );
                    }) : (
                        <p className="text-white p-4">Empty</p>
                    )}
                </div>
                <div className="min-w-0 border-2 bg-black-russian/35 border-dark-silver rounded-xl drop-shadow-plume hover:drop-shadow-goldish transition ease-in-out delay-150 overflow-hidden">
                    <div className="p-8">
                        Champion stats
                        <div className="min-w-0">
                            <SummonerMatchStats gameList={gameList} summoner={summoner} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlayerPage;
