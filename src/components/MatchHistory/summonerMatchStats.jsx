import {useState, useEffect} from 'react';
import ChampionStats from '../ChampionsPlayed/championStats';

const processChampionStats = (gameList, summonerPUUID) => {
    const championStats = {};

    gameList.forEach((game) => {
        const player = game.info.participants.find(
            (participant) => participant.puuid === summonerPUUID
        );

        if (player) {
            const { championName, kills, deaths, assists, timePlayed, win } = player;

            if (!championStats[championName]) {
                championStats[championName] = {
                    gamesPlayed: 0,
                    wins: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    timePlayed: 0,
                };
            }

            championStats[championName].gamesPlayed += 1;
            championStats[championName].wins += win ? 1 : 0;
            championStats[championName].kills += kills;
            championStats[championName].deaths += deaths;
            championStats[championName].assists += assists;
            championStats[championName].timePlayed += timePlayed;
        }
    });

    // Calculate KDA and win rate for each champion
    Object.keys(championStats).forEach((championName) => {
        const stats = championStats[championName];
        stats.kda = ((stats.kills + stats.assists) / Math.max(1, stats.deaths)).toFixed(2);
        stats.detailsKDA = `${(stats.kills / stats.gamesPlayed).toFixed(0)} / ${(stats.deaths / stats.gamesPlayed).toFixed(0)} / ${(stats.assists / stats.gamesPlayed).toFixed(0)}`;
        stats.winRate = ((stats.wins / stats.gamesPlayed) * 100).toFixed(0);
    });

    return championStats;
};

const SummonerMatchStats = ({ gameList, summoner }) => {
    const [championStats, setChampionStats] = useState({});

    useEffect(() => {
        if (gameList.length && summoner.puuid) {
            const stats = processChampionStats(gameList, summoner.puuid);
            setChampionStats(stats);
        }
    }, [gameList, summoner.puuid]);

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