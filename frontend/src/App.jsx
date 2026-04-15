import React, { useRef, useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LiveChat from './components/LiveChat';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Stats from './pages/Stats';
import Market from './pages/Market';
import SkinMarket from './pages/SkinMarket';
import AdminPanel from './pages/AdminPanel';
import { AuthContext } from './context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from './api';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return null;
  if (user) return <Navigate to="/profile" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  const [isAdmin, setIsAdmin] = useState(null);
  const location = useLocation();
  
  useEffect(() => {
    console.log('[AdminRoute] useEffect triggered', { user, loading });
    if (user?.steam_id) {
      console.log('[AdminRoute] Checking admin for steam_id:', user.steam_id);
      api.get(`/admins/is-admin?steam_id=${encodeURIComponent(user.steam_id)}`)
        .then(res => {
          console.log('[AdminRoute] isAdmin API response:', res.data);
          setIsAdmin(res.data.is_admin);
        })
        .catch(err => {
          console.error('[AdminRoute] isAdmin API error:', err);
          setIsAdmin(false);
        });
    } else {
      console.log('[AdminRoute] No steam_id, setting isAdmin to false');
      setIsAdmin(false);
    }
  }, [user]);
  
  console.log('[AdminRoute] Render:', { loading, hasUser: !!user, userSteamId: user?.steam_id, isAdmin });
  
  if (loading) {
    console.log('[AdminRoute] Showing loading spinner (loading=true)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#0a0c10]">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!user) {
    console.log('[AdminRoute] No user, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (isAdmin === null) {
    console.log('[AdminRoute] isAdmin is null, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#0a0c10]">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAdmin) {
    console.log('[AdminRoute] User is not admin, redirecting to /');
    return <Navigate to="/" replace />;
  }
  
  console.log('[AdminRoute] Rendering children (admin access granted)');
  return children;
};

function App() {
  const chatRef = useRef(null);
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen font-sans selection:bg-orange-500/30 selection:text-white flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/market" element={<Market />} />
          <Route path="/skin-market" element={<SkinMarket liveChatRef={chatRef} />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        </Routes>
      </div>
      {!isAdminPage && <LiveChat ref={chatRef} />}
    </div>
  );
}

export default App;
