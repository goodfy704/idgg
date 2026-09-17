type SummonerKDAProps = {
    gameData: {
        info: {
            participants: {
                puuid: string;
                kills: number;
                deaths: number;
                assists: number;
                totalMinionsKilled: number;
                neutralMinionsKilled: number;
                timePlayed: number;
            }[];
        };
    };
    summoner: {
        puuid: string;
    };
};

function SummonerKDA({ gameData, summoner }: SummonerKDAProps) {
    const userParticipant = gameData.info.participants.find(
        participant => participant.puuid === summoner.puuid
    );

    if (!userParticipant) {
        return null;
    }

    const { kills, deaths, assists } = userParticipant;
    const totalCs = userParticipant.totalMinionsKilled + userParticipant.neutralMinionsKilled;
    const csPerMin = totalCs / (userParticipant.timePlayed / 60);

    return (
        <div>
            <p>{kills} / {deaths} / {assists}</p>
            <p>{csPerMin.toFixed(2)} cs/min</p>
        </div>
    );
}

export default SummonerKDA;