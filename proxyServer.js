var express = require('express');
var cors = require('cors');
const axios = require('axios');
const Bottleneck = require('bottleneck');

var app = express();

app.use(cors());

const limiter = new Bottleneck({
    minTime: 50, // 50ms between requests (20 per second)
}); 


const API_KEY="RGAPI-6fcdeb7b-ac2d-40db-b32e-29431839c9c0";

app.listen(4000, function () { 
    console.log("Server started on port 4000");
}); // localhost:4000

const regions = ['europe', 'americas', 'asia', 'esports']; 
const subRegions = ['br1','eun1','euw1','jp1','kr','la1','la2','me1','na1','oc1','ph2','ru','sg2','th2','tr1','tw2','vn2']


// const regionToSubRegionMap = {
//     'europe': ['euw1', 'eun1', 'ru', 'tr1', 'me1'], // Expanded Europe subregions, including Turkey and Middle East
//     'americas': ['na1', 'la1', 'la2', 'br1'], // Americas subregions
//     'asia': ['kr', 'jp1', 'sg2', 'th2', 'tw2', 'vn2'], // Asia subregions, including Taiwan and Vietnam
//     'esports': ['oc1', 'ph2'] // Esports, mainly Oceania and Southeast Asia
// };


async function fetchWithRetry(url, res) {
    try {
      return await limiter.schedule(() => axios.get(url));
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 120;
        
        if (res) {
            res.status(429).send({ message: 'Rate limit exceeded. Retrying...', retryAfter });
        }

        console.log(`Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return fetchWithRetry(url, res); // Retry the request
      } else {
        console.error(`Error fetching data: ${error.message}`);
        throw error; // Re-throw other errors
      }
    }
  }

  async function getPlayerPUUID(playerName, playerTag) {
            const apiUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${playerName}/${playerTag}?api_key=${API_KEY}`;
            const response = await axios.get(apiUrl);
            if (response.data && response.data.puuid) {
                // If the player is found, return the PUUID and region
                console.log(response.data.puuid);
                return response.data.puuid
            }
        } catch (err) {
            console.error(`Error fetching player in ${region} : ${err.message}`);
        }
    }region
    // If no player is found in any region, return an empty object
    return {};
}

function getSummonerID(PUUID, subRegion) {
    const apiUrl = `https://${subRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${PUUID}?api_key=${API_KEY}`;
    return axios.get(apiUrl)
        .then(response => {
            return response.data.id;
        })
        .catch(err => {
            console.error(`Error fetching summoner ID from ${subRegion}: ${err.message}`);
            throw err; // Rethrow the error so it can be handled further up
        });
}

//GET past5Games
//GET localhost:4000/past5Games
app.get('/past5Games', async (req, res) => {
    const userInput = req.query.userInput;
    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    // PUUID
    const { puuid, region } = await getPlayerPUUID(username, tag);
    const API_CALL = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?api_key=${API_KEY}`;
    // get API_CALL
    // its going to give us a list of game IDs
    console.log(API_CALL)
    const gameIDs = await fetchWithRetry(API_CALL, res)
    .then(response => response.data)
    .catch(err => err);

    // loop through game IDs
    // at each loop, get the information based off ID (API_CALL)
    var matchDataArray = [];
    for(var i = 0;i < gameIDs.length-10; i++) {
        const matchID = gameIDs[i];
        const matchIDAPI = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchID}?api_key=${API_KEY}`;
        const matchData = await fetchWithRetry(matchIDAPI, res)
        .then(response => response.data)
        .catch(err => err);
        matchDataArray.push(matchData);
    }

    //save information above in an array, give array as JSON response to user
    // [Game1Object, Game2Object, ...]
    console.log(matchDataArray);
    res.json(matchDataArray);
});

app.get('/summoner', async (req, res) => {
    const userInput = req.query.userInput; // e.g., "username-tagline"
    const username = userInput.split("-")[0];   
    const tag = userInput.split("-")[1];

    // Get PUUID and region from getPlayerPUUID
    const { puuid, region } = await getPlayerPUUID(username, tag);

    // If no PUUID or region, return an error
    if (!puuid || !region) {
        return res.status(404).json({ message: 'Player not found in any region.' });
    }

    // Get the corresponding subRegions based on the player's region
    const subRegions = regionToSubRegionMap[region] || []; // Default to empty array if region not found

    // Try to fetch the summoner data from the identified subRegions
    for (let subRegion of subRegions) {
        try {
            const API_CALL = `https://${subRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${API_KEY}`;
            const response = await axios.get(API_CALL);
            
            // If we get a valid response, return the summoner data
            if (response.data) {
                //console.log(response.data);
                return res.json(response.data);
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.error(`Summoner not found in ${subRegion}: ${err.message}`);
            } else {
                console.error(`Error fetching summoner from ${subRegion}: ${err.message}`);
            }
            continue;  // Move to the next region if there's an error
        }
    }

    // If no valid summoner data was found in any region, return an error message
    res.status(404).json({ message: 'Summoner not found in any region.' });
});
app.get('/league', async (req, res) => {
    const userInput = req.query.userInput; // e.g., "username-tagline"
    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    
    // Get PUUID and region from getPlayerPUUID
    const { puuid, region } = await getPlayerPUUID(username, tag);

    // If no PUUID or region, return an error
    if (!puuid || !region) {
        return res.status(404).json({ message: 'Player not found in any region.' });
    }

    // Get the corresponding subRegions based on the player's region
    const subRegions = regionToSubRegionMap[region] || []; // Default to empty array if region not found

    // Try to fetch the league data from the identified subRegions
    for (let subRegion of subRegions) {
        try {
            const summonerID = await getSummonerID(puuid, subRegion);  // Get the summonerID for the player
            const API_CALL = `https://${subRegion}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerID}?api_key=${API_KEY}`;
            const response = await axios.get(API_CALL);
            
            // If we get a valid response, return the league data
            if (response.data) {
                //console.log(response.data);
                return res.json(response.data);
            }
        } catch (err) {
            console.error(`Error fetching league data from ${subRegion}: ${err.message}`);
            continue;
        }
    }

    // If no valid league data was found in any region, return an error message
    res.status(404).json({ message: 'League data not found in any region.' });
});

app.get('/championStats', async (req, res) => {
    const userInput = req.query.userInput;
    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    let count = 0;
    // PUUID
    const PUUID = await getPlayerPUUID(username, tag);
    const API_CALL = "https://europe.api.riotgames.com/" + "lol/match/v5/matches/by-puuid/" + PUUID + "/ids?start=0&count=25&" + "api_key=" + API_KEY;

    // get API_CALL
    // its going to give us a list of game IDs

    // Fetch all game IDs (up to 500 games)
    const gameIDs = await fetchWithRetry(API_CALL, res).then((response) => response.data).catch((err) => {
        console.error("Error fetching match IDs:", err);
        res.status(500).send("Error fetching match IDs.");
        return [];
    });

    // If no game IDs were retrieved
    if (!gameIDs.length) return res.status(200).json({ message: "No games found." });

    // Initialize storage for champion stats
    let champStats = {};
    let processedGames = 0; // Keep track of processed games

    // Helper function to process a batch of games
    const processBatch = async (batch) => {
        for (const matchID of batch) {
            const matchAPI = `https://europe.api.riotgames.com/lol/match/v5/matches/${matchID}?api_key=${API_KEY}`;
            const matchResponse = await fetchWithRetry(matchAPI);
            const matchData = matchResponse.data;
            const participant = matchData.info.participants.find((p) => p.puuid === PUUID);

            if (participant) {
                const championName = participant.championName;

                if (!champStats[championName]) {
                    champStats[championName] = {
                        games: 0,
                        wins: 0,
                        kills: 0,
                        deaths: 0,
                        assists: 0,
                    };
                }
                const stats = champStats[championName];
                stats.games += 1;
                stats.wins += participant.win ? 1 : 0;
                stats.kills += participant.kills;
                stats.deaths += participant.deaths;
                stats.assists += participant.assists;
            }
            processedGames += 1;
        }
    };

    // Batch processing
    for (let i = 0; i < gameIDs.length; i += 12) {
        const batch = gameIDs.slice(i, i + 12); // Get the next batch of 40 games
        await processBatch(batch); // Process the batch

        // Send intermediate results to the client
        const championsSorted = Object.entries(champStats)
            .map(([championName, stats]) => ({
                championName,
                games: stats.games,
                winRate: ((stats.wins / stats.games) * 100).toFixed(2),
                kda: ((stats.kills + stats.assists) / (stats.deaths || 1)).toFixed(2),
                kills: stats.kills,
                deaths: stats.deaths,
                assists: stats.assists,
            }))
            .sort((a, b) => b.games - a.games);

        res.write(JSON.stringify({ batchNumber: Math.ceil(i / 12) + 1, champions: championsSorted }));

        // Wait for 2 minutes before making the next batch of requests
        if (i + 12 < gameIDs.length) {
            await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
        }
    }

    // Final response
    res.end();
});