import {BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LikeButton from './components/like_button';
import NotFoundPage from './components/NotFoundPage';

function AppRoutes() {
    return (
        <Router>
            <Routes>
                <Route exact path="/" element={<LikeButton />}/>
                <Route exact path="/player" element={<NotFoundPage />}/>
            </Routes>
        </Router>
    )
}

export default AppRoutes;