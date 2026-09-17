import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/HomePage/home';
import NotFoundPage from './components/NotFoundPage';
import PlayerPage from './components/playerPage';
import TooManyRequests from './components/tooManyRequests';

function AppRoutes() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/notFound" element={<NotFoundPage />} />
                <Route path="/tooManyRequests" element={<TooManyRequests />} />
                <Route path="/player/:gameName/:tagLine" element={<PlayerPage />} />
            </Routes>
        </Router>
    );
}

export default AppRoutes;
