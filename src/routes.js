import {BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/home';
import NotFoundPage from './components/NotFoundPage';

function appRoutes() {
    return (
        <Router>
            <Routes>
                <Route exact path="/" element={<Home />}/>
                <Route exact path="/player" element={<NotFoundPage />}/>
            </Routes>
        </Router>
    )
}

export default appRoutes;