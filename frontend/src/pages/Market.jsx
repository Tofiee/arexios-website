import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { ShoppingCart, Crown, Shield, Star, CheckCircle, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Market() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [playerNick, setPlayerNick] = useState('');
  const [discordId, setDiscordId] = useState(user?.discord_username || '');
  const [optionalNote, setOptionalNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const packages = [
    {
      id: "gold_vip",
      name: "Gold V.I.P",
      price: "150 TL / Ay",
      color: "from-yellow-400 to-yellow-600",
      icon: <Crown className="w-8 h-8 text-yellow-100" />,
      features: ["Özel Yeşil Chat Yazısı", "Girişte VIP Duyurusu", "Gag Yetkisi", "Slot Garantisi"]
    },
    {
      id: "admin_basic",
      name: "Temel Adminlik",
      price: "300 TL / Ay",
      color: "from-indigo-500 to-purple-600",
      icon: <Shield className="w-8 h-8 text-indigo-100" />,
      features: ["Kick ve Slap Yetkisi", "Map Değiştirme", "Gold VIP Özellikleri", "Gag ve Ban Yetkisi"]
    },
    {
      id: "admin_pro",
      name: "Pro Adminlik",
      price: "500 TL / Ay",
      color: "from-red-500 to-red-700",
      icon: <Star className="w-8 h-8 text-red-100" />,
      features: ["Sınırsız Gag ve Ban Yetkisi", "Tüm Sunucu Yönetimi", "Discord'da Yönetici Rolü", "Özel Skin Erişimi"]
    }
  ];

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!playerNick) return;

    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        package_name: selectedPackage.name,
        price: selectedPackage.price,
        player_nick: playerNick,
        discord_id: discordId,
        optional_note: optionalNote
      };

      const res = await api.post('/discord/market', payload);
      setMessage({ type: res.data.status === 'success' ? 'success' : 'error', text: res.data.message });
      if (res.data.status === 'success') {
        setSelectedPackage(null);
        setPlayerNick('');
        setDiscordId('');
        setOptionalNote('');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'İletişim sırasında bir hata oluştu.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-12 px-4 bg-slate-50 dark:bg-[#0a0c10] text-slate-800 dark:text-slate-200">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <ShoppingCart className="w-16 h-16 text-indigo-500 hover:scale-110 transition-transform" />
          <h1 className="text-4xl md:text-5xl font-black uppercase text-slate-900 dark:text-white" style={{ fontFamily: 'Impact, sans-serif' }}>
            VIP & YETKİ MARKET
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl">
            Sunucumuza destek olarak size özel harika ayrıcalıklar kazanabilirsiniz! Satın alma istekleriniz doğudan Discord kanalımıza düşer ve anında işleme alınır.
          </p>
        </div>

        {/* Global Message Alert */}
        {message && !selectedPackage && (
          <div className={`p-4 rounded-lg max-w-xl mx-auto font-bold text-center shadow-lg ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-white dark:bg-[#151822] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform hover:-translate-y-2 transition-all duration-300 flex flex-col">
              <div className={`p-8 bg-gradient-to-br ${pkg.color} flex flex-col items-center justify-center text-white relative shadow-inner`}>
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  {pkg.icon}
                </div>
                {pkg.icon}
                <h3 className="text-2xl font-black mt-4 uppercase tracking-widest">{pkg.name}</h3>
                <div className="text-xl font-bold mt-2 opacity-90">{pkg.price}</div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <ul className="space-y-3 mb-6 flex-grow">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setSelectedPackage(pkg)}
                  className="w-full py-3 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase rounded-lg hover:opacity-90 shadow-lg active:scale-95 transition-all text-sm tracking-wider"
                >
                  {t('buy_now')}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Purchase Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151822] rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up">
            <div className={`p-4 bg-gradient-to-r ${selectedPackage.color} flex justify-between items-center text-white`}>
              <h3 className="font-black tracking-wider uppercase">{selectedPackage.name} Siparişi</h3>
              <button onClick={() => setSelectedPackage(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('ingame_nick')} *</label>
                <input
                  type="text"
                  required
                  value={playerNick}
                  onChange={e => setPlayerNick(e.target.value)}
                  placeholder="Zorunlu Alan"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('discord_id')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discordId}
                    onChange={e => setDiscordId(e.target.value)}
                    placeholder="Örn: arexios#1234"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {!user?.discord_username && (
                    <button
                      type="button"
                      onClick={() => window.location.href = `${API_URL}/discord/login?link_token=${localStorage.getItem('access_token')}`}
                      className="whitespace-nowrap flex items-center px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-lg"
                    >
                      Otomatik Çek
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('optional_note')}</label>
                <textarea
                  value={optionalNote}
                  onChange={e => setOptionalNote(e.target.value)}
                  placeholder="Varsa iletmek istediğiniz mesaj..."
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors resize-none h-24"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg uppercase tracking-wider text-sm transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
              >
                {loading ? 'İletiliyor...' : t('send_request')}
              </button>

              {message && (
                <div className={`mt-2 p-2 text-center rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {message.text}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
