type SummonerItemsProps = {
    gameData: {
        info: {
            participants: {
                puuid: string;
                item0: number;
                item1: number;
                item2: number;
                item3: number;
                item4: number;
                item5: number;
                item6: number;
            }[];
        };
    };
    summoner: {
        puuid: string;
    };
    itemUrl: string;
};

const itemRows = [
    ['item0', 'item1', 'item2', 'item6'],
    ['item3', 'item4', 'item5'],
] as const;

function SummonerItems({ gameData, summoner, itemUrl }: SummonerItemsProps) {
    const userParticipant = gameData.info.participants.find(
        participant => participant.puuid === summoner.puuid
    );

    if (!userParticipant) {
        return null;
    }

    return (
        <>
            {itemRows.map((row, rowIndex) => (
                <div key={row[0]} className={rowIndex === 0 ? 'flex mt-1' : 'flex'}>
                    {row.map(slot => {
                        const itemId = userParticipant[slot];

                        return itemId !== 0 ? (
                            <img
                                key={slot}
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={`${itemUrl}${itemId}.png`}
                            />
                        ) : (
                            <div
                                key={slot}
                                className="w-8 h-8 rounded-lg border border-deep-charocal"
                            ></div>
                        );
                    })}
                </div>
            ))}
        </>
    );
}

export default SummonerItems;