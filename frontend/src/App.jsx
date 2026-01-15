import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CalendarCallback from './pages/CalendarCallback';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const setAuth = (newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
    setToken(newToken);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing token={token} />} />
        <Route path="/login" element={!token ? <Login setAuth={setAuth} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!token ? <Register setAuth={setAuth} /> : <Navigate to="/dashboard" />} />
        <Route path="/calendar/callback" element={<CalendarCallback />} /> 
        <Route path="/dashboard" element={token ? <Dashboard token={token} logout={() => setAuth(null)} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
