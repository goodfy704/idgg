import {useState, useEffect} from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
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

function PlayerPage() {
    const [gameList, setGameList] = useState([]);
    const [summoner, setSummoner] = useState({});
    const [league, setLeague] = useState({});
    const [champStats, setChampStats] = useState({});
    const [loading, setLoading] = useState(true);
    const {state} = useLocation();
    const searchedText = state;
    const playerNameAndTagLine = state.searchedPlayer;
    const playerName = playerNameAndTagLine.split("#")[0];
    const tagLine = playerNameAndTagLine.split("#")[1];
    const championsUrl = "https://cdn.communitydragon.org/latest/champion/";
    const summonerUrl = "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/spell/";
    const runesUrl = "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/";
    const secondRunesUrl = "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7202_";
    const itemUrl = "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/item/";

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
    
    const importAll = (r) => r.keys().map(r);
    const images = importAll(require.context("../assets", false, /\.(png|jpe?g|svg)$/));


    function getSelectedPlayerIcon(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        return userParticipant.championName;

    }

    function getSelectedPlayerSummoners1(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            const summoner1Key = summonerSpells[userParticipant.summoner1Id];
            return summoner1Key;
        }

    }

    function getSelectedPlayerSummoners2(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            const summoner2Key = summonerSpells[userParticipant.summoner2Id];
            return summoner2Key;
        }

    }
    
    function getKeyStone1(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            const firstKeyStoneId = userParticipant.perks.styles[0]?.style;
            if (firstKeyStoneId) {
                var runeKey = runes.find(rune => rune.id === firstKeyStoneId)?.key; // Lookup key from your runes array
                return runeKey;
            }
        }
    }

    function getKeyStone2(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            const firstKeyStoneId = userParticipant.perks.styles[1]?.style;
            if (firstKeyStoneId) {
                var runeKey = runes.find(rune => rune.id === firstKeyStoneId)?.key; // Lookup key from your runes array
                if(runeKey === "Inspiration"){
                    runeKey = "Whimsy";
                }
                return runeKey;
            }
        }
    }

    function getKeyStoneId(gameData) {
        var tmp = getKeyStone2(gameData);
        
        if (tmp === "Inspiration") {
            tmp = "Whimsy"
        }
        // Find the matching key in the keyStones array and return its ID
        const matchingKeyStone = keyStones.find(keystone => keystone.key === tmp);
        if (matchingKeyStone) {
            return matchingKeyStone.id;
        }
    }

    function getSelectedPlayerRune1(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            const firstRuneId = userParticipant.perks.styles[0]?.selections[0]?.perk;
            if (firstRuneId) {
                const runeKey = runes.find(rune => rune.id === firstRuneId)?.key; // Lookup key from your runes array
                return runeKey;
            }
        }
    }

    function getSelectedPlayerRune1ForLethalTempo(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            const firstRuneId = userParticipant.perks.styles[0]?.selections[0]?.perk;
            if (firstRuneId) {
                var runeKey = runes.find(rune => rune.id === firstRuneId)?.key; // Lookup key from your runes array
                if(runeKey === "LethalTempo"){
                    runeKey = "LethalTempoTemp";
                }
                return runeKey;
            }
        }
    }


    function getKDA(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            var kills = userParticipant.kills;
            var assists = userParticipant.assists;
            var deaths = userParticipant.deaths;
            return (
                <>
                <div>
                    <p>{kills} / {deaths} / {assists}</p>
                </div>
                </>
            )
        }
    }

    function getItems(gameData) {
        const userPUUID = summoner.puuid;
        // Find the participant matching the user's PUUID in this game
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            var item0 = userParticipant.item0;
            var item1 = userParticipant.item1;
            var item2 = userParticipant.item2;
            var item3 = userParticipant.item3;
            var item4 = userParticipant.item4;
            var item5 = userParticipant.item5;
            var item6 = userParticipant.item6;

            return (
                <>
                    <div className="flex mt-1">
                        {item0 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item0 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item1 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item1 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item2 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item2 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item6 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item6 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                    </div>
                    <div className="flex">
                        {item3 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item3 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item4 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item4 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item5 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item5 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                    </div>
                </>
            )
        }
    }

    function getGameTime(gameData) {
        var gameTime = gameData.info.gameDuration;
        var minutes = Math.floor(gameTime / 60);
        var seconds = (gameTime / 60 - minutes) * 60;
        seconds = seconds.toFixed(0);

            return(
                <>
                    <div>
                        <p>{minutes}min {seconds}s</p>
                    </div>
                </>
            )
    }

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
                    axios.get("http://localhost:4000/past5Games", { params: { userInput: searchedText } }),
                    axios.get("http://localhost:4000/summoner", { params: { userInput: searchedText } }),
                    axios.get("http://localhost:4000/league", { params: { userInput: searchedText } }),
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
      }, [searchedText]);

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

    function getPlayerGames() {
        axios.get("http://localhost:4000/past5Games", { params: {userInput: searchedText}})
        .then(function (response) {
            setGameList(response.data)
        }).catch(function (error) {
            console.log(error);
        });
    }

    function getSummoner() {
        axios.get("http://localhost:4000/summoner", {params: {userInput: searchedText}})
        .then(function (response) {
          setSummoner(response.data)
        }).catch(function (error) {
          console.log(error);
        });
      }

    function getLeague() {
        axios.get("http://localhost:4000/league", {params: {userInput: searchedText}})
        .then(function (response) {
            setLeague(response.data)
        }).catch(function (error) {
            console.log(error);
        });
    }

    function getChampStats() {
        axios.get("http://localhost:4000/championStats", {params: {userInput: searchedText}})
        .then(function (response) {
        setChampStats(response.data)
        }).catch(function (error) {
          console.log(error);
        });
      }
      
     // console.log("summoner data: ", gameList);
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

    function calculateRankedWinrate(wins, losses) {
        let winRate = wins/(wins+losses)*100;
        return Math.round(winRate);
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
                    </>
                    }
                </div>
            <div className="">

            </div>
        </div>
        <div className="grid grid-cols-2 grid-rows-4 h-1/3 gap-4">
            <div className="border-2 rounded-xl mt-8">  
                <div className="mt-8 ml-8 w-2/5 border-2">
                    <p>Ranked solo</p>
                    <div className="grid grid-cols-10">
                        <div className="col-span-2">
                            {PlayerTier(league, league[0].queueType)}   
                        </div>
                        <div className="grid-cols-2 col-span-3">
                            <div className="border-2">
                                <div>{league[0].tier} {returnPlayerTierOrDontShowRankIfAboveMaster(league)}</div>
                                <div>{league[0].leaguePoints}LP</div>
                            </div>
                        </div>
                        <div className="grid-cols-2 col-span-4">
                            <div className="border-2">
                                <div>{league[0].wins}W {league[0].losses}L</div>
                                <div>{calculateRankedWinrate(league[0].wins, league[0].losses)}% Win Rate</div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-10">
                        <div className="col-span-2">
                            Grandmaster
                        </div>
                    </div>
                    <div>bar</div>
                </div>
                <div className="mt-8 ml-8 w-1/4 border-2">
                    <p>Ranked flex</p>
                    <div className="grid grid-cols-3">
                        {PlayerTier(league, league[1].queueType)}
                        <div className="border-2">
    
                                <div>{league[1].tier} {league[1].rank}</div>
                                <div>{league[1].leaguePoints}LP</div>
                 
                        </div>
                            <div className="border-2">
                                <div>{league[0].wins}W {league[1].losses}L</div>
                                <div>{calculateRankedWinrate(league[1].wins, league[1].losses)}% Win Rate</div>
                            </div>
                    </div>
                </div>
            </div>
                <div className="relative mt-8 border-2 rounded-xl grid grid-cols-1 h-max max-w-screen-lg">
                    {gameList.length !== 0 ?
                    <>
                    {   
                    gameList.map((gameData, index) =>
                    <div key={`game-${index}`} className="border-2 rounded-xl mb-4 mr-4 ml-4 grid grid-cols-3 grid-flow-row">
                        <div className="m-8 ml-12">
                            <p>{getGameTime(gameData)}</p>
                            <p className="ml-2">Ranked</p>
                        </div>
                        <div className="">
                            <div className="flex">
                                <img className="w-16 h-16 grid grid-cols-1 place-content-center" alt="" src={championsUrl + getSelectedPlayerIcon(gameData) + "/square"}></img>
                                <div className="ml-1 grid grid-cols-1">
                                    <img className="w-8 h-8" alt="" src={summonerUrl + getSelectedPlayerSummoners1(gameData) + ".png"}></img>
                                    <img className="w-8 h-8" alt="" src={summonerUrl + getSelectedPlayerSummoners2(gameData) + ".png"}></img>
                                </div>
                                <div className="ml-1 grid grid-cols-1">
                                    <img className="w-8 h-8" alt="" src={runesUrl + getKeyStone1(gameData) + "/" + getSelectedPlayerRune1(gameData) + "/" + getSelectedPlayerRune1ForLethalTempo(gameData) + ".png"}></img>
                                    <img className="w-6 h-6" alt="" src={runesUrl + getKeyStoneId(gameData) + "_" + getKeyStone2(gameData)  + ".png"}></img>
                                </div>
                                <div>
                                    <p>{getKDA(gameData)}</p>
                                </div>
                            </div>
                                <p>{getItems(gameData)}</p>
                        </div>
                        <div className="grid grid-cols-2 m-2">
                            <div className="text-yellow">   
                                {gameData.info.participants.slice(0, 5).map((data, participantIndex) => (
                                    <div key={`first-grid-${participantIndex}`} className="flex">
                                        <img className="w-6 h-6" alt="" src={championsUrl + data.championName + "/square"}></img>
                                        <p>{data.riotIdGameName}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="text-yellow">
                                {gameData.info.participants.slice(5).map((data, participantIndex) => (
                                    <div key={`first-grid-${participantIndex}`} className="flex">
                                        <img className="w-6 h-6" alt="" src={championsUrl + data.championName + "/square"}></img>
                                        <p>{data.riotIdGameName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    )
                    }
                    </>
                    :
                    <>
                    <p className="text-yellow">Empty</p>
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