import SummonerKDA from './summonerKDA';

type RuneStyle = {
    style: number;
    selections: {
        perk: number;
    }[];
};

type MatchParticipant = {
    puuid: string;
    championName: string;
    summoner1Id: number;
    summoner2Id: number;
    kills: number;
    deaths: number;
    assists: number;
    totalMinionsKilled: number;
    neutralMinionsKilled: number;
    timePlayed: number;
    perks: {
        styles: RuneStyle[];
    };
};

type SummonerKeystonesProps = {
    gameData: {
        info: {
            participants: MatchParticipant[];
        };
    };
    summoner: {
        puuid: string;
    };
    championsUrl: string;
    summonerUrl: string;
    runesUrl: string;
};

const summonerSpells: Record<number, string> = {
    1: 'SummonerBoost',
    3: 'SummonerExhaust',
    4: 'SummonerFlash',
    6: 'SummonerHaste',
    7: 'SummonerHeal',
    11: 'SummonerSmite',
    12: 'SummonerTeleport',
    13: 'SummonerMana',
    14: 'SummonerDot',
    21: 'SummonerBarrier',
    30: 'SummonerPoroRecall',
    31: 'SummonerPoroThrow',
    32: 'SummonerSnowball',
    39: 'SummonerSnowURFSnowball_Mark',
    54: 'Summoner_UltBookPlaceholder',
    55: 'Summoner_UltBookSmitePlaceholder',
    2201: 'SummonerCherryHold',
    2202: 'SummonerCherryFlash',
};

const runeNames: Record<number, string> = {
    8000: 'Precision',
    8005: 'PressTheAttack',
    8008: 'LethalTempo',
    8009: 'PresenceOfMind',
    8010: 'Conqueror',
    8014: 'CoupDeGrace',
    8017: 'CutDown',
    8021: 'FleetFootwork',
    8100: 'Domination',
    8105: 'RelentlessHunter',
    8106: 'UltimateHunter',
    8112: 'Electrocute',
    8120: 'GhostPoro',
    8126: 'CheapShot',
    8128: 'DarkHarvest',
    8135: 'TreasureHunter',
    8136: 'ZombieWard',
    8138: 'EyeballCollection',
    8139: 'TasteOfBlood',
    8143: 'SuddenImpact',
    8200: 'Sorcery',
    8210: 'Transcendence',
    8214: 'SummonAery',
    8224: 'NullifyingOrb',
    8226: 'ManaflowBand',
    8229: 'ArcaneComet',
    8230: 'PhaseRush',
    8232: 'Waterwalking',
    8233: 'AbsoluteFocus',
    8234: 'Celerity',
    8236: 'GatheringStorm',
    8237: 'Scorch',
    8242: 'Unflinching',
    8275: 'NimbusCloak',
    8299: 'LastStand',
    8300: 'Inspiration',
    8304: 'MagicalFootwear',
    8306: 'HextechFlashtraption',
    8313: 'PerfectTiming',
    8316: 'JackOfAllTrades',
    8321: 'CashBack',
    8345: 'BiscuitDelivery',
    8347: 'CosmicInsight',
    8351: 'GlacialAugment',
    8352: 'TimeWarpTonic',
    8360: 'UnsealedSpellbook',
    8369: 'FirstStrike',
    8400: 'Resolve',
    8401: 'ShieldBash',
    8410: 'ApproachVelocity',
    8429: 'Conditioning',
    8437: 'GraspOfTheUndying',
    8439: 'VeteranAftershock',
    8444: 'SecondWind',
    8446: 'Demolish',
    8451: 'Overgrowth',
    8453: 'Revitalize',
    8463: 'FontOfLife',
    8465: 'Guardian',
    8473: 'BonePlating',
    9101: 'AbsorbLife',
    9103: 'LegendBloodline',
    9104: 'LegendAlacrity',
    9105: 'LegendHaste',
    9111: 'Triumph',
    9923: 'HailOfBlades',
};

const secondaryRuneIds: Record<string, number> = {
    Sorcery: 7202,
    Domination: 7200,
    Whimsy: 7203,
    Precision: 7201,
    Resolve: 7204,
};

function SummonerKeystones({
    gameData,
    summoner,
    championsUrl,
    summonerUrl,
    runesUrl,
}: SummonerKeystonesProps) {
    const participant = gameData.info.participants.find(
        player => player.puuid === summoner.puuid
    );

    if (!participant) {
        return null;
    }

    const primaryStyleId = participant.perks.styles[0]?.style;
    const secondaryStyleId = participant.perks.styles[1]?.style;
    const primaryRuneId = participant.perks.styles[0]?.selections[0]?.perk;
    const primaryStyle = primaryStyleId ? runeNames[primaryStyleId] : undefined;
    const primaryRune = primaryRuneId ? runeNames[primaryRuneId] : undefined;
    const primaryRuneFile = primaryRune === 'LethalTempo' ? 'LethalTempoTemp' : primaryRune;
    const secondaryStyleName = secondaryStyleId ? runeNames[secondaryStyleId] : undefined;
    const secondaryStyle = secondaryStyleName === 'Inspiration' ? 'Whimsy' : secondaryStyleName;
    const secondaryRuneId = secondaryStyle ? secondaryRuneIds[secondaryStyle] : undefined;
    const firstSpell = summonerSpells[participant.summoner1Id];
    const secondSpell = summonerSpells[participant.summoner2Id];

    return (
        <div className="flex">
            <img
                className="w-16 h-16 grid grid-cols-1 place-content-center"
                alt={participant.championName}
                src={`${championsUrl}${participant.championName}/square`}
            />
            <div className="ml-1 grid grid-cols-1">
                {firstSpell && (
                    <img className="w-8 h-8" alt={firstSpell} src={`${summonerUrl}${firstSpell}.png`} />
                )}
                {secondSpell && (
                    <img className="w-8 h-8" alt={secondSpell} src={`${summonerUrl}${secondSpell}.png`} />
                )}
            </div>
            <div className="ml-1 grid grid-cols-1">
                {primaryStyle && primaryRune && primaryRuneFile && (
                    <img
                        className="w-8 h-8"
                        alt={primaryRune}
                        src={`${runesUrl}${primaryStyle}/${primaryRune}/${primaryRuneFile}.png`}
                    />
                )}
                {secondaryRuneId && secondaryStyle && (
                    <img
                        className="w-6 h-6"
                        alt={secondaryStyle}
                        src={`${runesUrl}${secondaryRuneId}_${secondaryStyle}.png`}
                    />
                )}
            </div>
            <SummonerKDA gameData={gameData} summoner={summoner} />
        </div>
    );
}

export default SummonerKeystones;
