import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';



const LastGamesStatistics = ({ gameList }) => {    
    return (
        <div className=" text-white mt-5">
            <h1 className="text-lg mb-5 text-center">Last 20 games</h1>
            <div className="flex">
                <div className="w-1/4 text-center">
                    <CircularProgressbar
                        value={gameList.winRate}
                        text={`${gameList.winRate}%`}
                        styles={buildStyles({
                            pathColor: gameList.winRate > 50 ? 'green' : 'red',
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
};

export default LastGamesStatistics;