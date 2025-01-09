import React from "react";

const matchTimeAndQueueType = ({ gameData }) => {
    var gameTime = gameData.info.gameDuration;
    var minutes = Math.floor(gameTime / 60);
    var seconds = (gameTime / 60 - minutes) * 60;
    seconds = seconds.toFixed(0);
    var gameType = gameData.info.gameMode;
    if (gameType === "CLASSIC")
    {
        gameType = "Ranked solo"
    } else if(gameType === "ARAM") {
        gameType = "Aram"
    }

        return(
            <>
                <div className="text-start">
                    <p>{minutes}min {seconds}s</p>
                    <p className="">{gameType}</p>
                </div>  
            </>
        )
};

export default matchTimeAndQueueType;