import './App.css';
import AppRoutes from './routes';

function App() {
  return (
    <div className="bg-black-russian min-h-screen grid">
      <div className="w-full flex">
        <AppRoutes />
      </div>
    </div>  
  );
}

export default App;
