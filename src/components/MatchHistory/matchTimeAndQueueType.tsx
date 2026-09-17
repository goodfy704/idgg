type MatchTimeAndQueueTypeProps = {
    gameData: {
        info: {
            gameDuration: number;
            gameMode: string;
            queueId: number;
        };
    };
};

const queueNames: Partial<Record<number, string>> = {
    0: 'Custom',
    400: 'Normal draft',
    420: 'Ranked solo',
    430: 'Normal blind',
    440: 'Ranked flex',
    450: 'ARAM',
    480: 'Swiftplay',
    490: 'Quickplay',
};

function MatchTimeAndQueueType({ gameData }: MatchTimeAndQueueTypeProps) {
    const { gameDuration, gameMode, queueId } = gameData.info;
    const minutes = Math.floor(gameDuration / 60);
    const seconds = Math.floor(gameDuration % 60);
    const fallbackName = gameMode === 'CLASSIC' ? "Summoner's Rift" : gameMode;
    const gameType = queueNames[queueId] ?? fallbackName;

    return (
        <div className="text-start">
            <p>{minutes}min {seconds}s</p>
            <p>{gameType}</p>
        </div>
    );
}

export default MatchTimeAndQueueType;