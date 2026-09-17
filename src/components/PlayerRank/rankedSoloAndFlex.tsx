import iron from '../../assets/iron.png';
import bronze from '../../assets/bronze.png';
import silver from '../../assets/silver.png';
import gold from '../../assets/gold.png';
import platinum from '../../assets/platinum.png';
import emerald from '../../assets/emerald.png';
import diamond from '../../assets/diamond.png';
import master from '../../assets/master.png';
import grandmaster from '../../assets/grandmaster.png';
import challenger from '../../assets/challenger.png';

export type LeagueEntry = {
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
};

type RankedSoloProps = {
    league: (LeagueEntry | null)[];
};

const tierImages: Partial<Record<string, string>> = {
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

const tierAbbreviations: Partial<Record<string, string>> = {
    IRON: 'I',
    BRONZE: 'B',
    SILVER: 'S',
    GOLD: 'G',
    PLATINUM: 'P',
    EMERALD: 'E',
    DIAMOND: 'D',
    MASTER: 'M',
    GRANDMASTER: 'GM',
    CHALLENGER: 'C',
};

const divisionNumbers: Partial<Record<string, number>> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
};

const tierOrder = [
    'IRON', 'BRONZE', 'SILVER', 'GOLD',
    'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER',
];

const queues = [
    { queueType: 'RANKED_SOLO_5x5', label: 'Ranked solo' },
    { queueType: 'RANKED_FLEX_SR', label: 'Ranked flex' },
];

function getNextRank(tier: string, rank: string): string {
    const division = divisionNumbers[rank];
    const tierIndex = tierOrder.indexOf(tier);

    if (!division || tierIndex === -1 || tier === 'MASTER') {
        return '';
    }

    if (division > 1) {
        return `${tierAbbreviations[tier] ?? tier}${division - 1}`;
    }

    const nextTier = tierOrder[tierIndex + 1];

    if (!nextTier) {
        return '';
    }

    return nextTier === 'MASTER'
        ? 'M'
        : `${tierAbbreviations[nextTier] ?? nextTier}4`;
}

function RankedSolo({ league }: RankedSoloProps) {
    const entries = Array.isArray(league) ? league : [];

    return (
        <div>
            {queues.map(({ queueType, label }) => {
                const entry = entries.find(item => item?.queueType === queueType);

                if (!entry) {
                    return null;
                }

                const tier = entry.tier.toUpperCase();
                const rank = entry.rank.toUpperCase();
                const isApexTier = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
                const tierImage = tierImages[tier];
                const gamesPlayed = entry.wins + entry.losses;
                const winRate = gamesPlayed > 0 ? Math.round(entry.wins / gamesPlayed * 100) : 0;
                const currentRank = `${tierAbbreviations[tier] ?? tier}${divisionNumbers[rank] ?? rank}`;
                const nextRank = isApexTier ? '' : getNextRank(tier, rank);
                const progress = Math.min(100, Math.max(0, entry.leaguePoints));

                return (
                    <div key={queueType} className="mt-8 ml-8 w-2/3">
                        <h1 className="text-lg">{label}</h1>
                        <div className="grid grid-cols-10">
                            <div className="col-span-2">
                                {tierImage && (
                                    <img className="w-16 h-16" src={tierImage} alt={tier} />
                                )}
                            </div>
                            <div className="grid-cols-2 col-span-3">
                                <div>{tier} {isApexTier ? '' : rank}</div>
                                <div>{entry.leaguePoints}LP</div>
                            </div>
                            <div className="grid-cols-2 col-span-3">
                                <div className="grid justify-end">
                                    <div className="text-end">{entry.wins}W {entry.losses}L</div>
                                    <div>{winRate}% Win Rate</div>
                                </div>
                            </div>
                        </div>
                        {nextRank && (
                            <>
                                <div className="grid grid-cols-10">
                                    <div className="col-span-2">{currentRank}</div>
                                    <div className="col-span-6 text-end">{nextRank}</div>
                                </div>
                                <div className="relative h-3 w-4/5 bg-gray-200 rounded-lg overflow-hidden border-2 mt-2">
                                    <div className="h-full bg-white" style={{ width: `${progress}%` }}></div>
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default RankedSolo;