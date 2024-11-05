import './App.css';
import LikeButton from './components/like_button';

function App() {
  return (
    <div className="bg-black-russian min-h-screen">
      <div className="absolute inset-y-1/2 w-full flex">
        <LikeButton />
      </div>
    </div>  
  );
}

export default App;
