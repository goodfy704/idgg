import './App.css';
import AppRoutes from './routes';

function App() {
  return (
    <div className="bg-black-russian min-h-screen">
      <div className="absolute inset-y-1/2 w-full flex">
        <AppRoutes />
      </div>
    </div>  
  );
}

export default App;
