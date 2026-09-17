import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export type RecentGameStatistics = {
    gamesPlayed: number;
    winRate: string;
    kda: string;
    avgKills: string;
    avgDeaths: string;
    avgAssists: string;
    csPerMinute: string;
};

type LastGamesStatisticsProps = {
    gameList: RecentGameStatistics;
};

function LastGamesStatistics({ gameList }: LastGamesStatisticsProps) {
    if (gameList.gamesPlayed === 0) {
        return (
            <div className="text-white mt-5 text-center">
                <h1 className="text-lg mb-5">Recent games</h1>
                <p>No data available.</p>
            </div>
        );
    }

    const winRate = Number(gameList.winRate);
    const gameLabel = gameList.gamesPlayed === 1 ? 'game' : 'games';

    return (
        <div className="text-white mt-5">
            <h1 className="text-lg mb-5 text-center">
                Last {gameList.gamesPlayed} {gameLabel}
            </h1>
            <div className="flex">
                <div className="w-1/4 text-center">
                    <CircularProgressbar
                        value={winRate}
                        text={`${winRate}%`}
                        styles={buildStyles({
                            pathColor: winRate > 50 ? 'green' : 'red',
                            textColor: 'white',
                            trailColor: '#2c2c2c',
                        })}
                    />
                </div>
                <div className="w-1/2 text-center">
                    <p className="text">KDA {gameList.kda}</p>
                    <p className="text">
                        {gameList.avgKills} / {gameList.avgDeaths} / {gameList.avgAssists}
                    </p>
                    <p className="text">Your cs per minute</p>
                    <p>{gameList.csPerMinute} cs/min</p>
                </div>
            </div>
        </div>
    );
}

export default LastGamesStatistics;