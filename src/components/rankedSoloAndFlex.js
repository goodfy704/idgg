import React from "react";

import iron from "../assets/iron.png"
import bronze from "../assets/bronze.png"
import silver from "../assets/silver.png"
import gold from "../assets/gold.png"
import platinum from "../assets/platinum.png"
import emerald from "../assets/emerald.png"
import diamond from "../assets/diamond.png"
import master from "../assets/master.png"
import grandmaster from "../assets/grandmaster.png"
import challenger from "../assets/challenger.png"

const tierImages = {
    IRON: iron,
    BRONZE: bronze,
    SILVER: silver,
    GOLD: gold,
    PLATINUM: platinum,
    EMERALD: emerald,
    DIAMOND: diamond,
    MASTER: master,
    GRANDMASTER: grandmaster,
    CHALLENGER: challenger,
};

function calculateRankedWinrate(wins, losses) {
    let winRate = (wins / (wins + losses)) * 100;
    return Math.round(winRate);
}

// Convert rank and tier into abbreviation
function convertRankAndTier(tier, rank) {
    const tierMap = {
        "IRON": "I",
        "BRONZE": "B",
        "SILVER": "S",
        "GOLD": "G",
        "PLATINUM": "P",
        "EMERALD": "E",
        "DIAMOND": "D",
        "MASTER": "M",
        "GRANDMASTER": "G",
        "CHALLENGER": "C"
    };

    const rankMap = {
        "I": "1",
        "II": "2",
        "III": "3",
        "IV": "4"
    };

    const tierAbbr = tierMap[tier.toUpperCase()] || tier;
    const rankNum = rankMap[rank.toUpperCase()] || rank;

    return `${tierAbbr}${rankNum}`;
}

// Get the next rank based on tier and current rank
function getNextRank(tier, rank) {
    const tierList = [
        "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"
    ];

    const tierMap = {
        "IRON": "I",
        "BRONZE": "B",
        "SILVER": "S",
        "GOLD": "G",
        "PLATINUM": "P",
        "EMERALD": "E",
        "DIAMOND": "D",
        "MASTER": "M",
        "GRANDMASTER": "G",
        "CHALLENGER": "C"
    };

    const rankMap = {
        "I": 1,
        "II": 2,
        "III": 3,
        "IV": 4
    };

    const rankRevMap = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV"
    };

    const currentRankNum = rankMap[rank.toUpperCase()] || rank;

    // If the rank is 1, move to the next tier and reset to rank 4
    if (currentRankNum === 1) {
        const nextTierIndex = tierList.indexOf(tier) + 1;
        if (nextTierIndex < tierList.length) {
            const nextTierAbbr = tierMap[tierList[nextTierIndex]];
            return `${nextTierAbbr}4`;  // Move to the next tier with rank 4
        }
    }

    // Otherwise, decrease the rank 
    const nextRankNum = currentRankNum - 1;
    const nextRankRoman = rankRevMap[nextRankNum] || rank;
    const nextRank = rankMap[nextRankRoman]
    return `${tierMap[tier]}${nextRank}`;
}

function returnPlayerTierOrDontShowRankIfAboveMaster(league) {
    if (league[0] === null || league[1] === null) {
        return (
            <div>
                Unranked
            </div>
        )
    }

    if (league[0].tier === "MASTER" || league[0].tier === "GRANDMASTER" || league[0].tier === "CHALLENGER") {
        league[0].rank = "";
    } else {
        return league[0].rank;
    }

}

const PlayerTier = (league, queueType) => {
    let playerTier = null;
    if (league[0] === null || league[1] === null) {
        return (
            <div>

            </div>
        )
    }else if(league[0].queueType === queueType){
        playerTier = league[0]?.tier?.toUpperCase(); // Ensure case matches keys in tierImages
    } else {
        playerTier = league[1]?.tier?.toUpperCase(); // Ensure case matches keys in tierImages
    }
    const tierImage = tierImages[playerTier]; // Default to iron if tier is not found
    console.log(tierImage);
    
    return (
        <div>
            <img className="w-16 h-16" src={tierImage} alt={playerTier} />           
        </div>
    );
};


function RankedSolo({ league }) {
    return (
        <div>
        <div className="mt-8 ml-8 w-2/5">
            <p>Ranked solo</p>
            <div className="grid grid-cols-10">
                <div className="col-span-2">
                    {PlayerTier(league, league[0].queueType)}  
                </div>
                <div className="grid-cols-2 col-span-3">
                    <div>
                        <div>{league[0].tier} {returnPlayerTierOrDontShowRankIfAboveMaster(league)}</div>
                        <div>{league[0].leaguePoints}LP</div>
                    </div>
                </div>
                <div className="grid-cols-2 col-span-3">
                    <div className="grid justify-end">
                        <div className="text-end">{league[0].wins}W {league[0].losses}L</div>
                        <div>{calculateRankedWinrate(league[0].wins, league[0].losses)}% Win Rate</div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-10">
                <div className="col-span-2">
                    {convertRankAndTier(league[0].tier, league[0].rank)}
                </div>
                <div className="col-span-6 text-end">
                    {getNextRank(league[0].tier, league[0].rank)}
                </div>
            </div>
            <div>
                <div className="relative h-3 w-4/5 bg-gray-200 rounded-lg overflow-hidden border-2 mt-2">
                    <div
                        className="h-full bg-white"
                        style={{
                            width: `${league[0].leaguePoints}%`,
                        }}
                    ></div>
                </div>
            </div>
        </div>
        <div className="mt-8 ml-8 w-2/5">
        <p>Ranked flex</p>
        <div className="grid grid-cols-10">
            <div className="col-span-2">
                {PlayerTier(league, league[1].queueType)}   
            </div>
            <div className="grid-cols-2 col-span-3">
                <div>
                    <div>{league[1].tier} {returnPlayerTierOrDontShowRankIfAboveMaster(league)}</div>
                    <div>{league[1].leaguePoints}LP</div>
                </div>
            </div>
            <div className="grid-cols-2 col-span-3">
                <div className="grid justify-end">
                    <div className="text-end">{league[1].wins}W {league[1].losses}L</div>
                    <div>{calculateRankedWinrate(league[1].wins, league[1].losses)}% Win Rate</div>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-10">
            <div className="col-span-2">
            {convertRankAndTier(league[1].tier, league[1].rank)}
            </div>
            <div className="col-span-6 text-end">
            {getNextRank(league[1].tier, league[1].rank)}
            </div>
        </div>
        <div>
            <div className="relative h-3 w-4/5 bg-gray-200 rounded-lg overflow-hidden border-2 mt-2">
                <div
                    className="h-full bg-white"
                    style={{
                        width: `${league[1].leaguePoints}%`,
                    }}
                ></div>
            </div>
        </div>
    </div>
    </div>
    );
}

export default RankedSolo;