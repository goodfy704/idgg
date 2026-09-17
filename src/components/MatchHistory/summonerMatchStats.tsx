import ChampionStats from '../ChampionsPlayed/championStats';

type SummonerMatchStatsProps = {
    gameList: {
        info: {
            participants: {
                puuid: string;
                championName: string;
                kills: number;
                deaths: number;
                assists: number;
                timePlayed: number;
                win: boolean;
            }[];
        };
    }[];
    summoner: {
        puuid?: string;
    };
};

type ChampionTotals = {
    gamesPlayed: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    timePlayed: number;
};

export type ChampionSummary = ChampionTotals & {
    kda: string;
    detailsKDA: string;
    winRate: string;
};

const processChampionStats = (
    gameList: SummonerMatchStatsProps['gameList'],
    summonerPUUID: string
): Record<string, ChampionSummary> => {
    const totalsByChampion: Record<string, ChampionTotals> = {};

    for (const game of gameList) {
        const player = game.info.participants.find(
            participant => participant.puuid === summonerPUUID
        );

        if (!player) {
            continue;
        }

        const { championName, kills, deaths, assists, timePlayed, win } = player;

        if (!Object.hasOwn(totalsByChampion, championName)) {
            totalsByChampion[championName] = {
                gamesPlayed: 0,
                wins: 0,
                kills: 0,
                deaths: 0,
                assists: 0,
                timePlayed: 0,
            };
        }

        const stats = totalsByChampion[championName];
        stats.gamesPlayed += 1;
        stats.wins += win ? 1 : 0;
        stats.kills += kills;
        stats.deaths += deaths;
        stats.assists += assists;
        stats.timePlayed += timePlayed;
    }

    const championStats: Record<string, ChampionSummary> = {};

    for (const [championName, stats] of Object.entries(totalsByChampion)) {
        const averageKills = (stats.kills / stats.gamesPlayed).toFixed(0);
        const averageDeaths = (stats.deaths / stats.gamesPlayed).toFixed(0);
        const averageAssists = (stats.assists / stats.gamesPlayed).toFixed(0);

        championStats[championName] = {
            ...stats,
            kda: ((stats.kills + stats.assists) / Math.max(1, stats.deaths)).toFixed(2),
            detailsKDA: `${averageKills} / ${averageDeaths} / ${averageAssists}`,
            winRate: ((stats.wins / stats.gamesPlayed) * 100).toFixed(0),
        };
    }

    return championStats;
};

function SummonerMatchStats({ gameList, summoner }: SummonerMatchStatsProps) {
    const championStats: Record<string, ChampionSummary> = summoner.puuid
        ? processChampionStats(gameList, summoner.puuid)
        : {};

    return (
        <div>
            {Object.keys(championStats).length > 0 ? (
                <ChampionStats stats={championStats} />
            ) : (
                <p className="text-white">No data available.</p>
            )}
        </div>
    );
}

export default SummonerMatchStats;