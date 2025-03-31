import {BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/HomePage/home';
import NotFoundPage from './components/NotFoundPage';
import PlayerPage from './components/playerPage'
import TooManyRequests from './components/tooManyRequests';

function appRoutes() {
    return (
        <Router>
            <Routes>
                <Route exact path="/" element={<Home />}/>
                <Route exact path="/notFound" element={<NotFoundPage />}/>
                <Route exact path="/tooManyRequests" element={<TooManyRequests />}/>
                <Route exact path="/:searchedPlayer" element={<PlayerPage />}/>
            </Routes>
        </Router>
    )
}

export default appRoutes;