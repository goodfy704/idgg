import React from "react";
import { useNavigate } from 'react-router-dom';

const MatchParticipants = ({ gameData, championsUrl }) => {
    const navigate = useNavigate();

    // Function to handle click and navigate to player stats
    const handlePlayerClick = (gameName, tagline) => {
        const formattedSearchText = gameName.concat('-', tagline);
        navigate(`/${formattedSearchText}`);
    };

    return (
        <div className="grid grid-cols-2 m-2">
                            <div className="text-white">   
                                {gameData.info.participants.slice(0, 5).map((data, participantIndex) => (
                                    <div key={`first-grid-${participantIndex}`} className="flex cursor-pointer" onClick={() => handlePlayerClick(data.riotIdGameName, data.riotIdTagline)}>
                                        <img className="w-6 h-6" alt="" src={championsUrl + data.championName + "/square"}></img>
                                        <p className="hover:underline">{data.riotIdGameName}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="text-white">
                                {gameData.info.participants.slice(5).map((data, participantIndex) => (
                                    <div key={`first-grid-${participantIndex}`} className="flex cursor-pointer" onClick={() => handlePlayerClick(data.riotIdGameName, data.riotIdTagline)}>
                                        <img className="w-6 h-6" alt="" src={championsUrl + data.championName + "/square"}></img>
                                        <p>{data.riotIdGameName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
    )
};

export default MatchParticipants;