import './App.css';
import LikeButton from './components/like_button';

function App() {
  return (
    <div className="bg-dark-gray min-h-screen">
      <div className="absolute inset-y-1/2 inset-x-1/2">
        <LikeButton />
      </div>
    </div>
  );
}

export default App;
