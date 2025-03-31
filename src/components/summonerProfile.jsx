import React from "react";

const summonerProfile = ({summoner, playerName, tagLine}) => {
    return (
        <div className="grid">
            <img className="w-32 h-32 justify-self-center" alt="profilePicture" src={"https://cdn.communitydragon.org/latest/profile-icon/" + summoner.profileIconId}></img>
            <p className="ml-auto mr-auto">{summoner.summonerLevel}</p>
            <div className="flex">
                <p className="ml-auto mr-auto text-lg"><b>{playerName}</b></p>
                <p className="ml-auto mr-auto text-lg">#{tagLine}</p>
            </div>
        </div>
    )
};

export default summonerProfile;