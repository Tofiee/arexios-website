import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../api';
import { Server, Users, Map as MapIcon, Copy, Target, Wifi, WifiOff, Check, Shield } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Home() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [csStatus, setCsStatus] = useState({ loading: true, data: null });
  const [tsStatus, setTsStatus] = useState({ loading: true, data: null });
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  useEffect(() => {
    if (user?.steam_id) {
      api.get(`/admins/is-admin?steam_id=${encodeURIComponent(user.steam_id)}`)
        .then(res => setIsAdmin(res.data.is_admin))
        .catch(() => setIsAdmin(false));
    }
  }, [user]);

  const CS_IP = "95.173.173.24:27015";
  const TS_IP = "ts3.arxcs.com";

  useEffect(() => {
    const fetchStatus = () => {
      api.get('/gametracker/server-info')
        .then(res => {
          if (res.data.status === 'success') {
            setCsStatus({ 
              loading: false, 
              data: { 
                status: 'online', 
                map: res.data.map,
                players: res.data.players,
                max_players: res.data.max_players,
                admin_online: res.data.admin_online || 0
              } 
            });
          } else {
            setCsStatus({ loading: false, data: { status: 'offline' } });
          }
        })
        .catch(() => setCsStatus({ loading: false, data: { status: 'offline' } }));

      api.get('/servers/ts')
        .then(res => setTsStatus({ loading: false, data: res.data }))
        .catch(() => setTsStatus({ loading: false, data: { status: 'offline' } }));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyIp = () => {
    navigator.clipboard.writeText(CS_IP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex flex-col relative overflow-hidden bg-slate-100 dark:bg-[#0a0c10]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat opacity-10 dark:opacity-20 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-100/80 to-slate-100 dark:via-[#0a0c10]/80 dark:to-[#0a0c10] pointer-events-none" />

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
        <Target className="w-20 h-20 text-orange-500 mb-6 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-pulse" />
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4" style={{fontFamily: 'Impact, sans-serif'}}>
          ARX<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">CSGO</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl font-medium tracking-wide mb-10">
          {t('hero_subtitle')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          <button
            onClick={() => setShowRulesModal(true)}
            className="flex-1 py-4 px-6 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest rounded border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center justify-center gap-2 group"
          >
            <Server className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {t('connect_server')}
          </button>
          <a
            href="ts3server://spjb?nickname=Websitenizden%20geliyorum"
            className="flex-1 py-4 px-6 bg-[#7289da] hover:bg-[#5b6eae] text-white font-bold uppercase tracking-widest rounded border-b-4 border-[#4a5899] active:border-b-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {t('connect_teamspeak')}
          </a>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {isAdmin && (
          <Link
            to="/admin"
            className="col-span-full bg-purple-600 hover:bg-purple-500 p-4 rounded-xl border border-purple-500 shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
          >
            <Shield className="w-6 h-6 text-white" />
            <span className="text-white font-bold uppercase tracking-widest">{t('admin_panel')}</span>
          </Link>
        )}

        {/* CS 1.6 Widget */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">{t('cs_widget_title')}</h3>
              <p className="text-xs text-slate-500 font-mono mt-1">{CS_IP}</p>
            </div>
            {csStatus.loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full" />
            ) : csStatus.data?.status === 'online' ? (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 border border-emerald-500/20">
                <Wifi className="w-3 h-3" /> {t('server_online')}
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 border border-red-500/20">
                <WifiOff className="w-3 h-3" /> {t('server_offline')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{t('players')}</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">
                {csStatus.data?.status === 'online' ? `${csStatus.data.players} / ${csStatus.data.max_players}` : '- / -'}
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-100 dark:border-slate-700/50 overflow-hidden">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <MapIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{t('map')}</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-white truncate" title={csStatus.data?.map}>
                {csStatus.data?.status === 'online' ? csStatus.data.map : '-'}
              </p>
            </div>
            
            {csStatus.data?.admin_online > 0 && (
              <div className="col-span-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    {csStatus.data.admin_online} {t('admin_online_server')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TS3 Widget */}
        <div className="bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md p-6 rounded-xl border border-slate-200 dark:border-[#24283b] shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#7289da]" />
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">{t('ts_widget_title')}</h3>
              <p className="text-xs text-slate-500 font-mono mt-1">{TS_IP}</p>
            </div>
            {tsStatus.loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-[#7289da] border-t-transparent rounded-full" />
            ) : tsStatus.data?.status === 'online' ? (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 border border-emerald-500/20">
                <Wifi className="w-3 h-3" /> {t('server_online')}
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 border border-red-500/20">
                <WifiOff className="w-3 h-3" /> {t('server_offline')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-slate-50 dark:bg-slate-800/30 p-4 rounded border border-slate-100 dark:border-slate-700/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${tsStatus.data?.status === 'online' ? 'bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite]' : 'bg-red-500'}`} />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wider">{t('active_connection')}</span>
              </div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">
                {tsStatus.data?.status === 'online' ? `${tsStatus.data.players}` : '-'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {showRulesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="bg-orange-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <h2 className="text-xl font-bold">{t('server_rules_title')}</h2>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-2 hover:bg-orange-500 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {t('read_rules_before_connect')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_3')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_4')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">5</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_5')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">6</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_6')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">7</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_7')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">8</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_8')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">9</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_9')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">10</span>
                  <span className="text-slate-700 dark:text-slate-300">{t('rule_10')}</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                />
                <span className="text-slate-700 dark:text-slate-300">{t('accept_rules')}</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <a
                  href={`steam://connect/${CS_IP}`}
                  onClick={() => {
                    if (rulesAccepted) {
                      localStorage.setItem('rulesAccepted', 'true');
                      setShowRulesModal(false);
                    }
                  }}
                  className={`flex-1 py-3 px-4 font-bold rounded-lg transition-all text-center ${
                    rulesAccepted
                      ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg'
                      : 'bg-slate-300 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {t('connect')}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
