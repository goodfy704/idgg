import React from "react";

const summonerKDA = ({ gameData, summoner }) => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    if(userParticipant)
    {
        var kills = userParticipant.kills;
        var assists = userParticipant.assists;
        var deaths = userParticipant.deaths;
        return (
            <>
            <div>
                <p>{kills} / {deaths} / {assists}</p>
            </div>
            </>
        )
    }
};

export default summonerKDA;