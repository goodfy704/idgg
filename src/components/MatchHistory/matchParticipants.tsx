import { useNavigate } from 'react-router-dom';

type MatchParticipantsProps = {
    gameData: {
        info: {
            participants: {
                puuid: string;
                championName: string;
                riotIdGameName: string;
                riotIdTagline: string;
            }[];
        };
    };
    championsUrl: string;
};

function MatchParticipants({ gameData, championsUrl }: MatchParticipantsProps) {
    const navigate = useNavigate();
    const teams = [
        gameData.info.participants.slice(0, 5),
        gameData.info.participants.slice(5),
    ];

    const handlePlayerClick = (gameName: string, tagLine: string) => {
        const formattedSearchText = `${gameName}-${tagLine}`;
        navigate(`/${encodeURIComponent(formattedSearchText)}`);
    };

    return (
        <div className="grid grid-cols-2 m-2">
            {teams.map((participants, teamIndex) => (
                <div key={teamIndex} className="text-white">
                    {participants.map(participant => (
                        <div
                            key={participant.puuid}
                            className="flex cursor-pointer"
                            onClick={() => handlePlayerClick(participant.riotIdGameName, participant.riotIdTagline)}
                        >
                            <img
                                className="w-6 h-6"
                                alt=""
                                src={`${championsUrl}${participant.championName}/square`}
                            />
                            <p className="hover:underline">{participant.riotIdGameName}</p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default MatchParticipants;