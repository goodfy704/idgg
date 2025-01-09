import React from 'react';

const championsUrl = "https://cdn.communitydragon.org/latest/champion/";

const ChampionStats = ({ stats }) => {
    return (
        <div className="grid grid-cols-2">
            {Object.keys(stats).map((championName) => {
                const { gamesPlayed, kda, detailsKDA, winRate } = stats[championName];

                return (
                    <div
                        key={championName}
                        className="grid grid-cols-6 items-center w-5/6 hover:drop-shadow-goldish"
                    >
                        <img
                            src={`${championsUrl}${championName}/square`}
                            alt={championName}
                            className="w-16 h-16 mb-2"
                        />
                        <div className="grid grid-cols-6 grid-rows-2 col-span-5">
                            <p className="text-white font-bold">{championName}</p>
                            <p className="text-white col-span-2 text-center">KDA: {kda}</p>
                            <p className="text-white col-span-3">{winRate}%</p>
                            <p className="text-white m-0 p-0 col-span-2"> {detailsKDA}</p>
                            <p className="text-white m-0 p-0 col-span-2 text-center">{gamesPlayed} games</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ChampionStats;