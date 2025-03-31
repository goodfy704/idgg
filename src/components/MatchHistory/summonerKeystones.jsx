import React from 'react';

import SummonerKDA from './summonerKDA';

const summonerSpells = {
    21: "SummonerBarrier",
    1: "SummonerBoost",
    2202: "SummonerCherryFlash",
    2201: "SummonerCherryHold",
    14: "SummonerDot",
    3: "SummonerExhaust",
    4: "SummonerFlash",
    6: "SummonerHaste",
    7: "SummonerHeal",
    13: "SummonerMana",
    30: "SummonerPoroRecall",
    31: "SummonerPoroThrow",
    11: "SummonerSmite",
    39: "SummonerSnowURFSnowball_Mark",
    32: "SummonerSnowball",
    12: "SummonerTeleport",
    54: "Summoner_UltBookPlaceholder",
    55: "Summoner_UltBookSmitePlaceholder",
};

const runes = [
    { id: 8100, key: "Domination" },
    { id: 8112, key: "Electrocute" },
    { id: 8128, key: "DarkHarvest" },
    { id: 9923, key: "HailOfBlades" },
    { id: 8126, key: "CheapShot" },
    { id: 8139, key: "TasteOfBlood" },
    { id: 8143, key: "SuddenImpact" },
    { id: 8136, key: "ZombieWard" },
    { id: 8120, key: "GhostPoro" },
    { id: 8138, key: "EyeballCollection" },
    { id: 8135, key: "TreasureHunter" },
    { id: 8105, key: "RelentlessHunter" },
    { id: 8106, key: "UltimateHunter" },
    { id: 8300, key: "Inspiration" },
    { id: 8351, key: "GlacialAugment" },
    { id: 8360, key: "UnsealedSpellbook" },
    { id: 8369, key: "FirstStrike" },
    { id: 8306, key: "HextechFlashtraption" },
    { id: 8304, key: "MagicalFootwear" },
    { id: 8321, key: "CashBack" },
    { id: 8313, key: "PerfectTiming" },
    { id: 8352, key: "TimeWarpTonic" },
    { id: 8345, key: "BiscuitDelivery" },
    { id: 8347, key: "CosmicInsight" },
    { id: 8410, key: "ApproachVelocity" },
    { id: 8316, key: "JackOfAllTrades" },
    { id: 8000, key: "Precision" },
    { id: 8005, key: "PressTheAttack" },
    { id: 8008, key: "LethalTempo" },
    { id: 8021, key: "FleetFootwork" },
    { id: 8010, key: "Conqueror" },
    { id: 9101, key: "AbsorbLife" },
    { id: 9111, key: "Triumph" },
    { id: 8009, key: "PresenceOfMind" },
    { id: 9104, key: "LegendAlacrity" },
    { id: 9105, key: "LegendHaste" },
    { id: 9103, key: "LegendBloodline" },
    { id: 8014, key: "CoupDeGrace" },
    { id: 8017, key: "CutDown" },
    { id: 8299, key: "LastStand" },
    { id: 8400, key: "Resolve" },
    { id: 8437, key: "GraspOfTheUndying" },
    { id: 8439, key: "VeteranAftershock" },
    { id: 8465, key: "Guardian" },
    { id: 8446, key: "Demolish" },
    { id: 8463, key: "FontOfLife" },
    { id: 8401, key: "ShieldBash" },
    { id: 8429, key: "Conditioning" },
    { id: 8444, key: "SecondWind" },
    { id: 8473, key: "BonePlating" },
    { id: 8451, key: "Overgrowth" },
    { id: 8453, key: "Revitalize" },
    { id: 8242, key: "Unflinching" },
    { id: 8200, key: "Sorcery" },
    { id: 8214, key: "SummonAery" },
    { id: 8229, key: "ArcaneComet" },
    { id: 8230, key: "PhaseRush" },
    { id: 8224, key: "NullifyingOrb" },
    { id: 8226, key: "ManaflowBand" },
    { id: 8275, key: "NimbusCloak" },
    { id: 8210, key: "Transcendence" },
    { id: 8234, key: "Celerity" },
    { id: 8233, key: "AbsoluteFocus" },
    { id: 8237, key: "Scorch" },
    { id: 8232, key: "Waterwalking" },
    { id: 8236, key: "GatheringStorm" },
];

const keyStones = [
    {id: 7202, key: "Sorcery"},
    {id: 7200, key: "Domination"},
    {id: 7203, key: "Whimsy"},
    {id: 7201, key: "Precision"},
    {id: 7204, key: "Resolve"},
];

const SummonerKeystones = ({ gameData, summoner, championsUrl, summonerUrl, runesUrl }) => {

const getSelectedPlayerIcon = () => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    return userParticipant.championName;
};

const getSelectedPlayerSummoners1 = () => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    return userParticipant ? summonerSpells[userParticipant.summoner1Id] : '';
};

const getSelectedPlayerSummoners2 = () => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    return userParticipant ? summonerSpells[userParticipant.summoner2Id] : '';
};

const getKeyStone1 = () => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    const firstKeyStoneId = userParticipant?.perks.styles[0]?.style;
    return firstKeyStoneId ? runes.find(rune => rune.id === firstKeyStoneId)?.key : '';
};

const getKeyStone2 = () => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    const secondKeyStoneId = userParticipant?.perks.styles[1]?.style;
    if (secondKeyStoneId) {
        let runeKey = runes.find(rune => rune.id === secondKeyStoneId)?.key;
        if (runeKey === 'Inspiration') {
            runeKey = 'Whimsy';
        }
        return runeKey;
    }
    return '';
};

const getKeyStoneId = () => {
    const key = getKeyStone2();
    const matchingKeyStone = keyStones.find(keystone => keystone.key === key);
    return matchingKeyStone?.id || '';
};

const getSelectedPlayerRune1 = () => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    const firstRuneId = userParticipant?.perks.styles[0]?.selections[0]?.perk;
    return firstRuneId ? runes.find(rune => rune.id === firstRuneId)?.key : '';
};

const getSelectedPlayerRune1ForLethalTempo = () => {
    const userPUUID = summoner.puuid;
    const userParticipant = gameData.info.participants.find(
        (participant) => participant.puuid === userPUUID
    );
    const firstRuneId = userParticipant?.perks.styles[0]?.selections[0]?.perk;
    if (firstRuneId) {
        let runeKey = runes.find(rune => rune.id === firstRuneId)?.key;
        if (runeKey === 'LethalTempo') {
            runeKey = 'LethalTempoTemp';
        }
        return runeKey;
    }
    return '';
};

return (
    <div className="flex">
        <img
            className="w-16 h-16 grid grid-cols-1 place-content-center"
            alt=""
            src={`${championsUrl}${getSelectedPlayerIcon()}/square`}
        />
        <div className="ml-1 grid grid-cols-1">
            <img
                className="w-8 h-8"
                alt=""
                src={`${summonerUrl}${getSelectedPlayerSummoners1()}.png`}
            />
            <img
                className="w-8 h-8"
                alt=""
                src={`${summonerUrl}${getSelectedPlayerSummoners2()}.png`}
            />
        </div>
        <div className="ml-1 grid grid-cols-1">
            <img
                className="w-8 h-8"
                alt=""
                src={`${runesUrl}${getKeyStone1()}/${getSelectedPlayerRune1()}/${getSelectedPlayerRune1ForLethalTempo()}.png`}
            />
            <img
                className="w-6 h-6"
                alt=""
                src={`${runesUrl}${getKeyStoneId()}_${getKeyStone2()}.png`}
            />
        </div>
        <SummonerKDA gameData={gameData} summoner={summoner}/>
    </div>
);
};

export default SummonerKeystones;