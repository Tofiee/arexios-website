import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Trophy, ShieldAlert, Search, Clock, Shield, AlertTriangle, MessageSquareWarning } from 'lucide-react';

export default function Stats() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('top15');
  const [top15, setTop15] = useState({ loading: true, data: [], error: null });
  const [searchTerm, setSearchTerm] = useState('');

  // Sadece mockup ban datası (Gerçeği ileri aşamada çekilecek)
  const mockBans = [
    { id: 1, player: "charles*", admin: "Savasci", reason: "Wallhack", expires: "Kalıcı" },
    { id: 2, player: "Valeria", admin: "Console", reason: "Reklam", expires: "1 Gün" },
    { id: 3, player: "m1krop", admin: "Server", reason: "Spam", expires: "6 Saat" }
  ];

  useEffect(() => {
    if (activeTab === 'top15') {
      fetchTop15();
    }
  }, [activeTab]);

  const fetchTop15 = async () => {
    setTop15(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.get('/stats/top15');
      if (res.data.status === 'success') {
        setTop15({ loading: false, data: res.data.data, error: null });
      } else {
        setTop15({ loading: false, data: [], error: res.data.message });
      }
    } catch (e) {
      setTop15({ loading: false, data: [], error: "Bilinmeyen bir ağ hatası oluştu." });
    }
  };

  const filteredTop15 = useMemo(() => {
    if (!searchTerm) return top15.data;
    return top15.data.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [top15.data, searchTerm]);

  const filteredBans = useMemo(() => {
    if (!searchTerm) return mockBans;
    return mockBans.filter(p => p.player.toLowerCase().includes(searchTerm.toLowerCase()) || p.admin.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [mockBans, searchTerm]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full py-12 px-4 bg-slate-50 dark:bg-[#0a0c10] text-slate-800 dark:text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <Trophy className="w-16 h-16 text-orange-500 mb-2 drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
          <h1 className="text-4xl md:text-5xl font-black uppercase text-slate-900 dark:text-white" style={{fontFamily: 'Impact, sans-serif'}}>
            {t('stats')}
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-orange-600 to-yellow-500 rounded-full" />
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center items-center p-1 bg-slate-200 dark:bg-slate-900 rounded-lg w-full max-w-sm mx-auto shadow-inner border border-slate-300 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('top15')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold rounded-md transition-all ${
              activeTab === 'top15' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" /> {t('top15')}
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold rounded-md transition-all ${
              activeTab === 'bans' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> {t('ban_list')}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm mx-auto">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('search_player')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#151822] border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 shadow-sm"
          />
        </div>

        {/* Tab Content: TOP 15 */}
        {activeTab === 'top15' && (
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800 shadow-xl bg-white dark:bg-[#151822]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#1c212e] border-b border-slate-300 dark:border-slate-800 text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <th className="py-4 px-6 font-black w-24 text-center">{t('rank')}</th>
                  <th className="py-4 px-6 font-black">{t('player_name')}</th>
                  <th className="py-4 px-4 font-black text-center text-emerald-600 dark:text-emerald-500">{t('kills')}</th>
                  <th className="py-4 px-4 font-black text-center text-orange-600 dark:text-orange-500">{t('headshots')}</th>
                  <th className="py-4 px-6 font-black text-right text-red-600 dark:text-red-500">{t('deaths')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {top15.loading ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin w-8 h-8 md:w-16 md:h-16 border-4 border-orange-500 border-t-transparent rounded-full" />
                        <span className="font-bold tracking-widest uppercase text-xs animate-pulse">KRİPTOLANIYOR...</span>
                      </div>
                    </td>
                  </tr>
                ) : top15.error ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-red-500 font-bold bg-red-500/5">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      {top15.error}
                    </td>
                  </tr>
                ) : filteredTop15.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-500">
                      Oyuncu bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredTop15.map((player) => (
                    <tr key={player.rank} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${
                          parseInt(player.rank) === 1 ? 'bg-yellow-500 text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                          parseInt(player.rank) === 2 ? 'bg-slate-300 text-slate-800' :
                          parseInt(player.rank) === 3 ? 'bg-orange-800 text-orange-200' :
                          'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}>
                          #{player.rank}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                        {player.name}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {player.kills}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-orange-600 dark:text-orange-400 font-bold">
                        {player.headshots}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-red-600 dark:text-red-400 font-bold">
                        {player.deaths}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content: BANS */}
        {activeTab === 'bans' && (
          <div className="flex flex-col space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex gap-3 text-sm font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{t('demo_ban_notice')}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-red-200 dark:border-red-900/30 shadow-xl bg-white dark:bg-[#151822]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50 dark:bg-[#201518] border-b border-red-200 dark:border-red-900/50 text-xs uppercase tracking-widest text-red-800 dark:text-red-400">
                    <th className="py-4 px-6 font-black">{t('player_name')}</th>
                    <th className="py-4 px-6 font-black">{t('admin')}</th>
                    <th className="py-4 px-6 font-black">{t('reason')}</th>
                    <th className="py-4 px-6 font-black text-right">{t('expires')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-900/20">
                  {filteredBans.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        Ban kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredBans.map((ban) => (
                      <tr key={ban.id} className="hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                          {ban.player}
                        </td>
                        <td className="py-4 px-6 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-500" /> {ban.admin}
                        </td>
                        <td className="py-4 px-6 text-yellow-600 dark:text-yellow-500 font-medium">
                          {ban.reason}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-red-600 dark:text-red-400 uppercase text-xs tracking-wider">
                          {ban.expires}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button className="py-3 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg border-b-4 border-slate-300 dark:border-slate-900 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2 uppercase tracking-wider text-sm shadow-lg">
                <MessageSquareWarning className="w-5 h-5" />
                {t('appeal_ban')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
