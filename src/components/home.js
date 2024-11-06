
var API_KEY = "RGAPI-01fb28b2-3553-453c-8784-1d5452d9ad5c"
var summonerName = "";
var euwURL = "https://europe.api.riotgames.com";


function home() {
    return (
      <div className="max-w-screen-lg mx-auto"> 
          <div className="relative top-1/2">
          <div className="absolute -inset-1 -m-4 ring ring-dark-silver rounded-lg"></div>
          <div className="absolute -inset-1 -m-4 ring bg-dark-silver bg-opacity-10 ring-dark-silver rounded-lg blur"></div>
              <input type="search" id="search" className="relative bg-black-russian block w-full p-4 ps-5 text-sm rounded-lg text-gray-light focus:outline-none ring-1 ring-dark-silver ring-opacity-50 mr-200" placeholder="Search Mockups, Logos..." required />
              <button type="submit" id="search-btn" onClick={searchSummoner} className="absolute end-2.5 bottom-2.5 font-medium rounded-lg text-sm px-4 py-2"> 
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-light" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
              </button>
          </div>
      </div>
    );
  }

function searchSummoner() {
    summonerName = document.getElementById("search").value;
    console.log(summonerName);
    data();
}

async function data() {
  var summonerNameURL = "/riot/account/v1/accounts/by-riot-id/"+summonerName;
    var fullSummonerName = euwURL + summonerNameURL+"?api_key="+API_KEY;
    document.write(fullSummonerName);
}


export default home;