import {useState, useEffect} from 'react';
import axios, { HttpStatusCode } from 'axios';
import { useParams, useNavigate } from 'react-router-dom'; 

import RankedSolo from './rankedSoloAndFlex';
import SummonerKeystones from './summonerKeystones';
import SummonerItems from './summonerItems';
import MatchTimeAndQueueType from './matchTimeAndQueueType';
import MatchParticipants from './matchParticipants';
import SummonerProfile from './summonerProfile';
import NotFoundPage from './NotFoundPage';
import SummonerMatchStats from './summonerMatchStats';
import LastGamesStatistics from './lastGamesStatistics';

function PlayerPage() {
    const [gameList, setGameList] = useState([]);
    const [summoner, setSummoner] = useState({});
    const [league, setLeague] = useState({});
    const [champStats, setChampStats] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const { searchedPlayer } = useParams();
    const [playerName, tagLine] = searchedPlayer.split("-");
    const championsUrl = "https://cdn.communitydragon.org/latest/champion/";
    const summonerUrl = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img/spell/";
    const runesUrl = "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/";
    const secondRunesUrl = "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7202_";
    const itemUrl = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/";

    // Helper function to rearrange league data
    const rearrangeLeagueData = (leagueData) => {
        const rankedSolo = leagueData.find(queue => queue.queueType === "RANKED_SOLO_5x5");
        const rankedFlex = leagueData.find(queue => queue.queueType === "RANKED_FLEX_SR");

        // Return a new array with the desired order
        return [rankedSolo || {}, rankedFlex || {}];
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true); // Set loading to true before fetching
                const [gamesResponse, summonerResponse, leagueResponse] = await Promise.all([
                    axios.get("http://localhost:4000/past5Games", { params: { userInput: searchedPlayer } }),
                    axios.get("http://localhost:4000/summoner", { params: { userInput: searchedPlayer } }),
                    axios.get("http://localhost:4000/league", { params: { userInput: searchedPlayer } }),
                ]);

                const rearrangedLeague = rearrangeLeagueData(leagueResponse.data);
                console.log("asdasd", rearrangedLeague);
                
                // Update states with fetched data
                setSummoner(summonerResponse.data); 
                setGameList(gamesResponse.data);
                setLeague(rearrangedLeague);
                console.log(summonerResponse.data);
                if (!summonerResponse.data || Object.keys(summonerResponse.data).length === 0) {
                    navigate("/notFound"); // Redirect to Not Found page
                  }

            } catch (error) {   
                console.error("Error fetching data:", error);
                navigate("/tooManyRequests");
            } finally {
                setLoading(false); // Set loading to false after fetching
            }
        };

        fetchData();
      }, [searchedPlayer]);

    //   useEffect(() => {
    //     const fetchChampionStats = async () => {
    //         try {
    //             const champStatsResponse = await axios.get("http://localhost:4000/championStats", { params: { userInput: searchedText } });
    //             setChampStats(champStatsResponse.data);
    //         } catch (error) {
    //             console.error("Error fetching champion stats:", error);
    //             setChampStats([]);
    //         }
    //     };
    
    //     fetchChampionStats();
    // }, [searchedText]);

     console.log("summoner data: ", gameList);
    //   console.log("summoner data: ", summoner);
      console.log("ranked, first is flex second is solo", league);
    //    console.log("Champ stats: ", champStats);

    if (loading) {
        return (
            <div className="text-white w-screen text-center h-screen content-center text-4xl">
                <p>Loading...</p>
            </div>
        );
    }
    const calculateLast20GamesStats = (gameList, summonerPUUID) => {
        const championStats = {};
        const aggregatedStats = {
            gamesPlayed: 0,
            wins: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            totalMinionsKilled: 0,
            timePlayed: 0,
            neutralMinionsKilled: 0,
        };
    
        gameList.forEach((game) => {
            const player = game.info.participants.find(
                (participant) => participant.puuid === summonerPUUID
            );
    
            if (player) {
                const { championName, kills, deaths, assists, totalMinionsKilled, timePlayed, neutralMinionsKilled,  win } = player;
    
                // Update champion-specific stats
                if (!championStats[championName]) {
                    championStats[championName] = {
                        gamesPlayed: 0,
                        wins: 0,
                        kills: 0,
                        deaths: 0,
                        assists: 0,
                        totalMinionsKilled: 0,
                        timePlayed: 0,
                        neutralMinionsKilled: 0,
                    };
                }
    
                championStats[championName].gamesPlayed += 1;
                championStats[championName].wins += win ? 1 : 0;
                championStats[championName].kills += kills;
                championStats[championName].deaths += deaths;
                championStats[championName].assists += assists;
                championStats[championName].totalMinionsKilled += totalMinionsKilled;
                championStats[championName].timePlayed += timePlayed;
                championStats[championName].neutralMinionsKilled += neutralMinionsKilled;
    
                // Update aggregated stats
                aggregatedStats.gamesPlayed += 1;
                aggregatedStats.wins += win ? 1 : 0;
                aggregatedStats.kills += kills;
                aggregatedStats.deaths += deaths;
                aggregatedStats.assists += assists;
                aggregatedStats.totalMinionsKilled += totalMinionsKilled;
                aggregatedStats.timePlayed += timePlayed;
                aggregatedStats.neutralMinionsKilled += neutralMinionsKilled;
            }
        });

        const b = championStats;
        console.log("champ stats?   ", championStats);

        const a = aggregatedStats.totalMinionsKilled + aggregatedStats.neutralMinionsKilled; 
        console.log("ggeg", a, "time", aggregatedStats.gameDuration)
        // Calculate aggregated KDA and win rate
        aggregatedStats.kda = ((aggregatedStats.kills + aggregatedStats.assists) / Math.max(1, aggregatedStats.deaths)).toFixed(2);
        aggregatedStats.winRate = ((aggregatedStats.wins / aggregatedStats.gamesPlayed) * 100).toFixed(0);
        aggregatedStats.csPerMinute = ((aggregatedStats.totalMinionsKilled + aggregatedStats.neutralMinionsKilled) / (aggregatedStats.timePlayed / 60)).toFixed(2);
        aggregatedStats.avgKDA = `${(aggregatedStats.kills / aggregatedStats.gamesPlayed).toFixed(0)} / ${(aggregatedStats.deaths / aggregatedStats.gamesPlayed).toFixed(0)} / ${(aggregatedStats.assists / aggregatedStats.gamesPlayed).toFixed(0)}`;
        aggregatedStats.avgKills = (aggregatedStats.kills / aggregatedStats.gamesPlayed).toFixed(0);
        aggregatedStats.avgDeaths = (aggregatedStats.deaths / aggregatedStats.gamesPlayed).toFixed(0);
        aggregatedStats.avgAssists = (aggregatedStats.assists / aggregatedStats.gamesPlayed).toFixed(0);
        
        
        
        return { championStats, aggregatedStats };
    };

    const getMostPlayedChampion = (championStats) => {
        let mostPlayedChampion = null;
        let maxGamesPlayed = 0;
    
        for (const [championName, stats] of Object.entries(championStats)) {
            if (stats.gamesPlayed > maxGamesPlayed) {
                mostPlayedChampion = { championName, ...stats };
                maxGamesPlayed = stats.gamesPlayed;
            }
        }
    
        return mostPlayedChampion;
    };

    function getPlayerPUUID(gameData, summoner) {
        const player = gameData.info.participants.find(
            (participant) => participant.puuid === summoner
        );
        return player;
    }

const { championStats, aggregatedStats } = calculateLast20GamesStats(gameList, summoner.puuid);
console.log("this is champStats", championStats, "this is aggregatedStats", aggregatedStats);

const mostPlayedChampion = getMostPlayedChampion(championStats);

    return <div className="text-white grid gap-4 grid-cols-1 place-content-start">
        <div className="w-screen pt-64 bg-gradient-to-r from-darker-plume via-dark-plume to-darker-plume border-b-2 hover:drop-shadow-goldish border-plume ">

                <div className="flex justify-center">
                    {JSON.stringify(summoner) !== '{}' ?
                    <>
                    <SummonerProfile summoner={summoner} playerName={playerName} tagLine={tagLine}/>
                    </> 
                    :
                    <>
                    <NotFoundPage />
                    </>
                    }
                </div>
            <div className="">

            </div>
        </div>
        <div className="grid grid-cols-2 grid-rows-4 h-1/3 gap-4 ml-32">
            <div className="rounded-xl mt-8 grid grid-cols-5 bg-black-russian bg-opacity-35 border-2 transition ease-in-out delay-150 border-dark-silver drop-shadow-plume hover:drop-shadow-goldish"> 
                <div className="col-span-3">
                    <RankedSolo league={league} />
                </div>
                <div className="col-span-2">
                <LastGamesStatistics gameList={aggregatedStats}/>
                {mostPlayedChampion && (    
            <div className="col-span-5 mt-4">
                <h3 className="text-lg text-center mb-5">Your most champion</h3>
                
                <div className="grid grid-cols-4">
                    <img className="w-20 h-20 " alt="" src={championsUrl + mostPlayedChampion.championName + "/square"}></img>
                <div className="col-span-3">
                    <p>Games Played: {mostPlayedChampion.gamesPlayed}</p>
                    <p>KDA: {(mostPlayedChampion.kills / mostPlayedChampion.gamesPlayed).toFixed(2)} / {(mostPlayedChampion.deaths / mostPlayedChampion.gamesPlayed).toFixed(2)} / {(mostPlayedChampion.assists / mostPlayedChampion.gamesPlayed).toFixed(2)}</p>
                    <p>Win Rate: {((mostPlayedChampion.wins / mostPlayedChampion.gamesPlayed) * 100).toFixed(0)}%</p>
                </div>
                </div>
            </div>
        )}
                </div>
            </div>
                <div className="relative mt-8 border-2 bg-black-russian bg-opacity-35 transition ease-in-out delay-150 border-dark-silver rounded-xl drop-shadow-plume hover:drop-shadow-goldish grid grid-cols-1 h-max max-w-screen-lg">
                    {gameList.length !== 0 ?
                    <>
                    {   
                    gameList.map((gameData, index) =>
                    <div key={`game-${index}`} className={`first:mt-4 mb-4 mr-4 ml-4 grid grid-cols-3 grid-flow-row transition ease-in-out delay-150 border-2 rounded-xl drop-shadow-plume hover:drop-shadow-goldish
                        ${getPlayerPUUID(gameData, summoner.puuid)?.win ? 'from-green/5 via-green/5 via-5% to-transparent bg-gradient-to-r' : 'from-red/5 to-transparent bg-gradient-to-r via-5%'}`}>
                        <div className="m-8 ml-12"> 
                            <MatchTimeAndQueueType gameData={gameData}/>
                        </div>
                        <div className="">
                            <SummonerKeystones 
                                gameData={gameData} 
                                summoner={summoner} 
                                championsUrl={championsUrl} 
                                summonerUrl={summonerUrl} 
                                runesUrl={runesUrl} 
                            />
                            <SummonerItems 
                                gameData={gameData} 
                                summoner={summoner} 
                                itemUrl={itemUrl}  />
                        </div>
                        <MatchParticipants gameData={gameData} championsUrl={championsUrl}/>
                    </div>
                    )
                    }
                    </>
                    :
                    <>
                    <p className="text-white">Empty</p>
                    </>
                }
                </div>
            <div className="border-2 bg-black-russian bg-opacity-35 transition ease-in-out delay-150 border-dark-silver rounded-xl drop-shadow-plume hover:drop-shadow-goldish grid">
                <div className="mt-8 ml-8">
                    Champion stats
                    <div>
                        <SummonerMatchStats gameList={gameList} summoner={summoner} />
                    </div>
                </div>
            </div>  
        </div>
    </div>
}



export default PlayerPage;  