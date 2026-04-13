import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

export default function Profile() {
  const { t } = useTranslation();
  const { user, checkAuth, logoutUser } = useContext(AuthContext);
  const location = useLocation();
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("msg") === "linked") {
      setStatusMsg("Steam hesabı başarıyla bağlandı!");
      checkAuth();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get("success") === "discord_linked") {
      setStatusMsg("Discord hesabınız başarıyla eşleştirildi!");
      checkAuth();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get("error") === "discord_denied") {
      setStatusMsg("Discord bağlantısı reddedildi.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-800 p-8 pt-12 relative overflow-hidden">
        {/* Banner */}
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-orange-500 to-yellow-500" />
        
        {statusMsg && (
          <div className="mb-6 bg-emerald-500/20 border border-emerald-500 text-emerald-400 p-3 rounded font-bold text-center animate-pulse">
            {statusMsg}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar Area */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 bg-slate-800 rounded-full border-4 border-slate-700 flex items-center justify-center shadow-lg relative overflow-hidden">
               {user.avatar_url ? (
                 <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-4xl font-bold text-orange-500 uppercase">{user.username.charAt(0)}</span>
               )}
            </div>
            <div className="mt-4 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/30 rounded text-sm font-bold uppercase tracking-widest text-center">
              {user.role}
            </div>
          </div>

          {/* User Info Area */}
          <div className="flex-1 w-full space-y-6 text-center md:text-left">
            <div>
              <h2 className="flex items-center justify-center md:justify-start gap-3 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {user.username}
                <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-300 uppercase tracking-widest border border-slate-300 dark:border-slate-600">
                  {user.provider}
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{user.email || 'E-Posta Eklenmemiş'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Steam Card */}
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between">
                 <div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Steam ID</h3>
                   <p className="text-slate-700 dark:text-slate-200 font-mono text-sm">{user.steam_id || 'Bağlanmadı'}</p>
                 </div>
                 
                 {!user.steam_id && (
                   <button 
                     onClick={() => window.location.href = `http://127.0.0.1:8000/auth/steam/login?link_token=${localStorage.getItem('access_token')}`}
                     className="mt-4 w-full py-2 bg-[#171a21] hover:bg-[#2a475e] text-white text-xs font-bold uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2"
                   >
                     <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" className="w-4 h-4 brightness-200" />
                     Steam'i Bağla
                   </button>
                 )}
               </div>

               {/* Discord Card */}
               <div className="bg-[#5865F2]/5 dark:bg-[#5865F2]/10 p-4 rounded-xl border border-[#5865F2]/20 flex flex-col justify-between">
                 <div>
                   <h3 className="text-xs font-bold text-[#5865F2] uppercase tracking-wider mb-1">Discord HESABI</h3>
                   <p className="text-slate-700 dark:text-slate-200 font-bold tracking-widest text-sm">{user.discord_username || 'Eşleştirilmedi'}</p>
                 </div>
                 
                 {!user.discord_username && (
                   <button 
                     onClick={() => window.location.href = `http://127.0.0.1:8000/discord/login?link_token=${localStorage.getItem('access_token')}`}
                     className="mt-4 w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] shadow-lg shadow-[#5865F2]/20 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2"
                   >
                     Discord'u Eşleştir
                   </button>
                 )}
               </div>

               {/* Register Date Card */}
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kayıt Tarihi</h3>
                 <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">
                   {new Date(user.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button 
            onClick={logoutUser}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest rounded transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
