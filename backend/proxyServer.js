var express = require('express');
var cors = require('cors');
const axios = require('axios');
const Bottleneck = require('bottleneck');

var app = express();

app.use(cors());

const limiter = new Bottleneck({
    minTime: 50, // 50ms between requests (20 per second)
});


const API_KEY="RGAPI-9b297f96-7fe6-4596-87b2-2282936bb213";

app.listen(4000, function () { 
    console.log("Server started on port 4000");
}); // localhost:4000

const subRegions = ['br1','euw1', 'eun1', 'jp1','kr','la1','la2','me1','na1','oc1','ph2','ru','sg2','th2','tr1','tw2','vn2'];
const regionToSubRegionMap = {
    'europe': ['euw1', 'eun1', 'ru', 'tr1', 'me1'],
    'americas': ['na1', 'la1', 'la2', 'br1'], 
    'asia': ['kr', 'jp1', 'sg2', 'th2', 'tw2', 'vn2'],
    'esports': ['oc1', 'ph2'] 
};

async function fetchWithRetry(url, res) {
    try {
      return await limiter.schedule(() => axios.get(url));
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 120; // Retry-After header or default to 1 second
        
        if (res) {
            res.status(429).send({ message: 'Rate limit exceeded. Retrying...', retryAfter });
        }

        console.log("Rate limit exceeded. Retrying after ${retryAfter} seconds...");
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return fetchWithRetry(url, res); // Retry the request
      } else {
        console.error("Error fetching data: ${error.message}");
        throw error; // Re-throw other errors
      }
    }
  }
//Does not matter you can get any PUUID using any region
function getPlayerPUUID(playerName, playerTag) {
    const apiUrl = "https://europe.api.riotgames.com" + "/riot/account/v1/accounts/by-riot-id/" + playerName + "/" + playerTag + "?api_key=" + API_KEY;
        return axios.get(apiUrl)
        .then(response => {
            console.log(response.data);
            return response.data.puuid
        }).catch (err => err);
}

async function getSummonerID(PUUID) {
    for (let subRegion of subRegions) {
        try {
            const apiUrl = `https://${subRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${PUUID}?api_key=${API_KEY}`;
            const response = await axios.get(apiUrl);
            if (response.data && response.data.id) {
                console.log(`Summoner found: ${response.data.id}, subRegion: ${subRegion}`);
                return { summonerID: response.data.id, subRegion };
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.error(`Summoner not found in ${subRegion}: ${err.message}`);
            } else {
                console.error(`Error fetching summoner from ${subRegion}: ${err.message}`);
            }
            continue; // Skip to the next subRegion on error
        }
    }
    console.error('Summoner not found in any subRegion.');
    return { summonerID: null, subRegion: null };
}    

//GET past5Games
//GET localhost:4000/past5Games
app.get('/past5Games', async (req, res) => {
    const userInput = req.query.userInput;
    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    const PUUID = await getPlayerPUUID(username, tag);
    
    const { summonerID, subRegion } = await getSummonerID(PUUID);

    if (!summonerID || !subRegion) {
        return res.status(404).json({ message: 'summonerID and subRegion bb bb' });
    }
    // knowing the subRegion you know which is main region
    const mainRegion = Object.keys(regionToSubRegionMap).find(region =>
        regionToSubRegionMap[region].includes(subRegion)
    );

    if (!mainRegion) {
        return res.status(400).json({ message: 'Main region could not be determined.' });
    }
    console.log(mainRegion);
    
    //after getting the right main region I use that to get match data
    const API_CALL = `https://${mainRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${PUUID}/ids?api_key=${API_KEY}`;

    // get API_CALL
    // its going to give us a list of game IDs
    const gameIDs = await fetchWithRetry(API_CALL, res)
    .then(response => response.data)
    .catch(err => err);

    // loop through game IDs
    // at each loop, get the information based off ID (API_CALL)
    var matchDataArray = [];
    for(var i = 0;i < gameIDs.length-10; i++) {
        const matchID = gameIDs[i];
        const matchIDAPI = `https://${mainRegion}.api.riotgames.com/lol/match/v5/matches/${matchID}?api_key=${API_KEY}`;
        const matchData = await fetchWithRetry(matchIDAPI, res)
        .then(response => response.data)
        .catch(err => err);
        matchDataArray.push(matchData);
    }

    //save information above in an array, give array as JSON response to user
    // [Game1Object, Game2Object, ...]
    res.json(matchDataArray);
});

app.get('/summoner', async (req, res) => {
    const userInput = req.query.userInput;
    const username = userInput.split("-")[0];   
    const tag = userInput.split("-")[1];
    
    const PUUID = await getPlayerPUUID(username, tag);
    const { summonerID, subRegion } = await getSummonerID(PUUID);

    if (!summonerID || !subRegion) {
        return res.status(404).json({ message: 'summonerID and subRegion bb bb' });
    }
    const API_CALL = `https://${subRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${PUUID}?api_key=${API_KEY}`;

    const summoner = await axios.get(API_CALL)
    .then(response => response.data)
    .catch(err => err);

    res.json(summoner);
});

app.get('/league', async (req, res) => {
    const userInput = req.query.userInput;
    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    const PUUID = await getPlayerPUUID(username, tag);

    const { summonerID, subRegion } = await getSummonerID(PUUID);

    if (!summonerID || !subRegion) {
        return res.status(404).json({ message: 'summonerID and subRegion bb bb' });
    }
    const API_CALL = `https://${subRegion}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerID}?api_key=${API_KEY}`;
    
    const league = await axios.get(API_CALL)
    .then(response => response.data)
    .catch(err => err);

    res.json(league);
});

app.get('/championStats', async (req, res) => {
    const userInput = req.query.userInput;
    const username = userInput.split("-")[0];
    const tag = userInput.split("-")[1];
    let count = 0;
    // PUUID
    const PUUID = await getPlayerPUUID(username, tag);
    const API_CALL = "https://europe.api.riotgames.com/" + "lol/match/v5/matches/by-puuid/" + PUUID + "/ids?start=0&count=25&" + "api_key=" + API_KEY;
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
                console.log(stats.games, championName);
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