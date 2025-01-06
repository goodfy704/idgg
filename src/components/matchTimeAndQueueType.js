import React from "react";

const matchTimeAndQueueType = ({ gameData }) => {
    var gameTime = gameData.info.gameDuration;
    var minutes = Math.floor(gameTime / 60);
    var seconds = (gameTime / 60 - minutes) * 60;
    seconds = seconds.toFixed(0);

        return(
            <>
                <div>
                    <p>{minutes}min {seconds}s</p>
                    <p className="ml-2">Ranked</p>
                </div>  
            </>
        )
};

export default matchTimeAndQueueType;