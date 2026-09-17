import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const isValidGameName = (value: string) => {
    const length = Array.from(value).length;
    return length >= 3 && length <= 16 && !value.includes('#');
};

const isValidTagLine = (value: string) => /^[\p{L}\p{N}]{3,5}$/u.test(value);

function Home() {
    const [searchText, setSearchText] = useState('');
    const [searchError, setSearchError] = useState('');
    const navigate = useNavigate();

    const handleSearch = () => {
        const separatorIndex = searchText.lastIndexOf('#');
        const normalizedGameName = searchText.slice(0, separatorIndex).trim();
        const normalizedTagLine = searchText.slice(separatorIndex + 1).trim();

        if (
            separatorIndex <= 0
            || !isValidGameName(normalizedGameName)
            || !isValidTagLine(normalizedTagLine)
        ) {
            setSearchError('Enter a Riot ID as Game Name#Tagline.');
            return;
        }

        setSearchError('');
        navigate(`/player/${encodeURIComponent(normalizedGameName)}/${encodeURIComponent(normalizedTagLine)}`);
    };

    return (
        <div className="w-full max-w-(--breakpoint-lg) mx-auto my-auto">
            <div className="relative p-4 rounded-lg ring-3 ring-dark-silver bg-dark-silver/10 shadow-[0_0_12px_rgba(180,170,180,0.35)]">
                <form
                    className="relative w-full"
                    onSubmit={event => {
                        event.preventDefault();
                        handleSearch();
                    }}
                >
                    <input
                        aria-label="Riot ID"
                        value={searchText}
                        onChange={event => setSearchText(event.target.value)}
                        type="search"
                        id="search"
                        className="block w-full bg-black-russian p-4 pr-16 text-sm rounded-lg text-gray-light focus:outline-hidden ring-1 ring-dark-silver/50"
                        placeholder="Game Name#Tagline"
                        required
                    />
                    <button
                        type="submit"
                        id="search-btn"
                        aria-label="Search player"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10! h-10! min-w-0! flex items-center justify-center p-0! m-0 rounded-lg"
                    >
                        <svg className="w-4! h-4! min-w-4! max-w-4! shrink-0 text-gray-light" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                    </button>
                </form>
            </div>
            {searchError && <p className="mt-3 text-red">{searchError}</p>}
        </div>
    );
}

export default Home;
