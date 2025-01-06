import {BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/home';
import NotFoundPage from './components/NotFoundPage';
import PlayerPage from './components/playerPage'

function appRoutes() {
    return (
        <Router>
            <Routes>
                <Route exact path="/" element={<Home />}/>
                <Route exact path="/player" element={<NotFoundPage />}/>
                <Route exact path="/stats" element={<PlayerPage />}/>
            </Routes>
        </Router>
    )
}

export default appRoutes;