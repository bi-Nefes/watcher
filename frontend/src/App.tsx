import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Outlet, Navigate, useLocation } from 'react-router-dom';
import Protected from './Protected';
import Login from './pages/Login';
import Watchers from './pages/Watchers';
import WatcherCreate from './pages/WatcherCreate';
import WatcherEdit from './pages/WatcherEdit';
import Events from './pages/Events';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import { setToken } from './api';

function App() {
  useEffect(() => {
    // Initialize token from localStorage on app startup
    const token = localStorage.getItem('token');
    if (token) {
      setToken(token);
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected><MainLayout /></Protected>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/watchers" element={<Watchers />} />
            <Route path="/watchers/new" element={<WatcherCreate />} />
            <Route path="/watchers/:id/edit" element={<WatcherEdit />} />
            <Route path="/events" element={<Events />} />
            <Route path="/users" element={<Users />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img src="/logo.svg" alt="Watcher" height={28} className="me-2" />
            Watcher
          </Link>
          <div className="navbar-nav me-auto">
            <Link 
              className={`nav-link ${currentPath === '/watchers' ? 'active' : ''}`} 
              to="/watchers"
            >
              Watchers
            </Link>
            <Link 
              className={`nav-link ${currentPath === '/events' ? 'active' : ''}`} 
              to="/events"
            >
              Events
            </Link>
            <Link 
              className={`nav-link ${currentPath === '/users' ? 'active' : ''}`} 
              to="/users"
            >
              Users
            </Link>
          </div>
          <div className="navbar-nav">
            <button className="btn btn-outline-light" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}

export default App;