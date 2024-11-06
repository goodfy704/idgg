
function LikeButton() {
    return (
      <div class="max-w-screen-lg mx-auto"> 
          <div class="relative top-1/2">
          <div class="absolute -inset-1 -m-4 ring ring-dark-silver rounded-lg"></div>
          <div class="absolute -inset-1 -m-4 ring bg-dark-silver bg-opacity-10 ring-dark-silver rounded-lg blur"></div>
              <input type="search" id="default-search" class="relative bg-black-russian block w-full p-4 ps-5 text-sm rounded-lg text-gray-light focus:outline-none ring-1 ring-dark-silver ring-opacity-50 mr-200" placeholder="Search Mockups, Logos..." required />
              <button type="submit" class="absolute end-2.5 bottom-2.5 font-medium rounded-lg text-sm px-4 py-2"> 
                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-light" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
              </button>
          </div>
      </div>
    );
  }

export default LikeButton;
