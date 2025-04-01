
import {useState} from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const [searchText, setSearchText] = useState("");
    const navigate = useNavigate();

    const handleSearch = () => {
        const formattedSearchText = searchText.replace("#", "-");
        navigate(`/${formattedSearchText}`);
      };

    return (
      <>
      <div className="grid grid-cols-1 h-screen place-items-center overflow-x-hidden">
          <div className="relative flex justify-center w-5/6 sm:max-lg:w-4/5 xl:w-3/5">
            <div className="absolute inset-1 -m-1 ring-3 ring-dark-silver rounded-lg"></div>
            <div className="absolute inset-1 -m-1 ring-3 bg-dark-silver/10 ring-dark-silver rounded-lg blur-xs"></div>
            <input onChange={e => setSearchText(e.target.value)}
                type="search"
                id="search"
                className="relative bg-black-russian w-full m-4
                p-4 text-sm rounded-lg text-gray-light focus:outline-hidden ring-1 ring-dark-silver/50"
                placeholder="Search sumonner"
                required/>
            <button type="submit" id="search-btn" onClick={handleSearch} className="absolute end-2.5 bottom-2.5 font-medium rounded-lg text-sm px-6 py-6"> 
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-light" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
            </button>
          </div>
      </div>
      </>
    );
}

export default Home;