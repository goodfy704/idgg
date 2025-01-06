import React from "react";

const matchParticipants = ({ gameData, championsUrl }) => {
    return (
        <div className="grid grid-cols-2 m-2">
                            <div className="text-white">   
                                {gameData.info.participants.slice(0, 5).map((data, participantIndex) => (
                                    <div key={`first-grid-${participantIndex}`} className="flex">
                                        <img className="w-6 h-6" alt="" src={championsUrl + data.championName + "/square"}></img>
                                        <p>{data.riotIdGameName}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="text-white">
                                {gameData.info.participants.slice(5).map((data, participantIndex) => (
                                    <div key={`first-grid-${participantIndex}`} className="flex">
                                        <img className="w-6 h-6" alt="" src={championsUrl + data.championName + "/square"}></img>
                                        <p>{data.riotIdGameName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
    )
};

export default matchParticipants;