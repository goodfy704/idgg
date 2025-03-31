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
        var totalCs = userParticipant.totalMinionsKilled + userParticipant.neutralMinionsKilled;
        var csPerMin = totalCs / (userParticipant.timePlayed / 60);
        return (
            <>
            <div>
                <p>{kills} / {deaths} / {assists}</p>
                <p>{csPerMin.toFixed(2)} cs/min</p>
            </div>
            </>
        )
    }
};

export default summonerKDA;