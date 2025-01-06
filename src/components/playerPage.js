import {useState, useEffect} from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; 

import RankedSolo from './rankedSoloAndFlex';
import SummonerKeystones from './summonerKeystones';
import SummonerItems from './summonerItems';
import MatchTimeAndQueueType from './matchTimeAndQueueType';
import MatchParticipants from './matchParticipants';

function PlayerPage() {
    const [gameList, setGameList] = useState([]);
    const [summoner, setSummoner] = useState({});
    const [league, setLeague] = useState({});
    const [champStats, setChampStats] = useState({});
    const [loading, setLoading] = useState(true);

    const { searchedPlayer } = useParams();
    const [playerName, tagLine] = searchedPlayer.split("-");
    const championsUrl = "https://cdn.communitydragon.org/latest/champion/";
    const summonerUrl = "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/spell/";
    const runesUrl = "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/";
    const secondRunesUrl = "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7202_";
    const itemUrl = "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/item/";

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
                
                // Update states with fetched data
                setGameList(gamesResponse.data);
                setSummoner(summonerResponse.data); 
                setLeague(rearrangedLeague);

            } catch (error) {   
                console.error("Error fetching data:", error);
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
            <div className="text-white flex justify-center items-center h-screen">
                <p>Loading...</p>
            </div>
        );
    }

    return <div className="text-white grid gap-4 grid-cols-1 place-content-start">
        <div className="w-screen pt-64 bg-deep-charocal">

                <div className="flex justify-center">
                    {JSON.stringify(summoner) !== '{}' ?
                    <>
                    <div className="grid">
                        <img className="w-32 h-32" alt="profilePicture" src={"https://cdn.communitydragon.org/latest/profile-icon/" + summoner.profileIconId}></img>
                        <p className="ml-auto mr-auto">{summoner.summonerLevel}</p>
                        <div className="flex">
                            <p className="ml-auto mr-auto text-lg"><b>{playerName}</b></p>
                            <p className="">#{tagLine}</p>
                        </div>
                    </div>
                    </> 
                    :
                    <>
                    <p>404 not found</p>
                    </>
                    }
                </div>
            <div className="">

            </div>
        </div>
        <div className="grid grid-cols-2 grid-rows-4 h-1/3 gap-4 ml-32">
            <div className="rounded-xl mt-8 border-2">  
                <RankedSolo league={league} />
            </div>
                <div className="relative mt-8 border-2 rounded-xl grid grid-cols-1 h-max max-w-screen-lg">
                    {gameList.length !== 0 ?
                    <>
                    {   
                    gameList.map((gameData, index) =>
                    <div key={`game-${index}`} className="border-2 rounded-xl mb-4 mr-4 ml-4 grid grid-cols-3 grid-flow-row">
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
            <div className="border-2 rounded-xl grid">
                <div className="mt-8 ml-8">
                    Champion stats
                    <div className="grid grid-cols-10 border-2">
                        <div className="border-2 ">sample1</div>
                        <div className="border-2 ">sample2</div>
                        <div className="col-span-6 border-2">sample3</div>
                    </div>
                </div>
            </div>  
        </div>
    </div>
}



export default PlayerPage;  