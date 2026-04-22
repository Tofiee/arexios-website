import React, { useState, useEffect, useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { ShoppingBag, ShoppingCart, Info, X, Crown, Sparkles } from 'lucide-react';

export default function SkinMarket({ liveChatRef }) {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [skins, setSkins] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTier, setSelectedTier] = useState('premium');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkin, setSelectedSkin] = useState(null);
  const [playerNick, setPlayerNick] = useState('');
  const [discordId, setDiscordId] = useState(user?.discord_username || '');
  const [optionalNote, setOptionalNote] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchSkins(selectedTier, selectedCategory);
  }, []);

  useEffect(() => {
    fetchSkins(selectedTier, selectedCategory);
  }, [selectedTier, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/skins/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchSkins = async (tier = null, categoryId = null) => {
    try {
      let url = '/skins/';
      const params = [];
      if (tier) params.push(`tier=${tier}`);
      if (categoryId) params.push(`category=${categoryId}`);
      if (params.length > 0) url += '?' + params.join('&');
      const res = await api.get(url);
      setSkins(res.data);
    } catch (err) {
      console.error('Failed to fetch skins:', err);
    }
    setLoading(false);
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!playerNick) return;

    setPurchasing(true);
    setMessage(null);
    try {
      const payload = {
        skin_name: selectedSkin.name,
        skin_id: selectedSkin.id || null,
        tier: selectedSkin.tier,
        player_nick: playerNick,
        discord_id: discordId,
        optional_note: optionalNote
      };

      const res = await api.post('/discord/skin-purchase', payload);
      setMessage({ type: res.data.status === 'success' ? 'success' : 'error', text: res.data.message });
      
      if (res.data.status === 'success') {
        const skinInfo = {
          skinName: selectedSkin.name,
          tier: selectedSkin.tier,
          playerNick: playerNick,
          discordId: discordId,
          optionalNote: optionalNote
        };
        
        if (liveChatRef?.current?.sendSkinPurchase) {
          liveChatRef.current.sendSkinPurchase(skinInfo);
        }
        
        setSelectedSkin(null);
        setPlayerNick('');
        setDiscordId('');
        setOptionalNote('');
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('error_occurred') });
    }
    setPurchasing(false);
  };

  const getSkinDisplayName = (skin) => {
    if (skin.category_name) {
      return `${skin.category_name} | ${skin.name}`;
    }
    return skin.name;
  };

  const getTierBadge = (skin) => {
    return null;
  };

  const tiers = [
    { id: 'premium', name: 'Premium', animatedGradient: false },
    { id: 'premium_plus', name: 'Premium', suffix: '+', animatedGradient: true }
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-[#0a0c10]">
        <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] py-12 px-4 bg-slate-50 dark:bg-[#0a0c10] text-slate-800 dark:text-slate-200">
      <div className="max-w-7xl mx-auto space-y-12">

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <ShoppingBag className="w-16 h-16 text-orange-500" />
            <Crown className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase text-slate-900 dark:text-white" style={{ fontFamily: 'Impact, sans-serif' }}>
            {t('skin_market_title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl">
            {t('skin_market_desc')}
          </p>
        </div>

        {message && !selectedSkin && (
          <div className={`p-4 rounded-lg max-w-xl mx-auto font-bold text-center shadow-lg ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message.text}
          </div>
        )}

<div className="flex flex-wrap justify-center gap-4 mb-8">
          {tiers.map(tier => {
            const isSelected = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(isSelected ? null : tier.id)}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 hover:scale-105 shadow-lg ${
                  isSelected ? 'text-white' : tier.animatedGradient ? 'text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-gradient-to-r hover:from-yellow-500 hover:to-amber-600 hover:text-white'
                }`}
                style={tier.animatedGradient ? {
                  background: 'linear-gradient(-45deg, #9333ea, #ec4899, #ef4444, #f97316, #9333ea)',
                  backgroundSize: '400% 400%',
                  animation: 'premiumGradient 4s ease infinite'
                } : isSelected ? {
                  background: 'linear-gradient(to right, #f59e0b, #d97706)'
                } : undefined}
              >
                <Crown className="w-4 h-4" />
                <span className="relative">
                  {tier.name}
                  {tier.suffix && <span className="absolute text-yellow-300 font-black text-lg leading-none" style={{ top: '-0.375rem', right: '-0.520rem' }}>+</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('all')}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex justify-center mb-8">
          <button onClick={() => setSelectedSkin({ name: selectedTier === 'premium_plus' ? 'Premium+ Paket' : 'Premium Paket', tier: selectedTier, image_url: '/placeholder.png' })} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Paketi Satın Al
          </button>
        </div>

        {skins.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">{t('no_skins_market')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {skins.map(skin => (
              <div
                key={skin.id}
                className="bg-white dark:bg-[#151822] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                  <img
                    src={skin.image_url}
                    alt={getSkinDisplayName(skin)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-400"><svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                    }}
                  />
                  {(skin.tier || skin.category_tier) && (
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        (skin.tier || skin.category_tier) === 'premium_plus'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : 'bg-purple-600 text-white'
                      }`}>
                        {(skin.tier || skin.category_tier) === 'premium_plus' ? 'PREMIUM+' : 'PREMIUM'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">
                    {getSkinDisplayName(skin)}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSkin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151822] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 flex justify-between items-center text-white">
              <h3 className="font-black tracking-wider uppercase">{t('skin_order_title')}</h3>
              <button onClick={() => setSelectedSkin(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-4">
                <div className="w-24 h-18 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0">
                  <img src={selectedSkin.image_url} alt={getSkinDisplayName(selectedSkin)} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{getSkinDisplayName(selectedSkin)}</h4>
                  {selectedSkin.tier && (
                    <p className={`text-2xl font-black mt-1 ${
                      selectedSkin.tier === 'premium_plus'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent'
                        : 'text-purple-600'
                    }`}>
                      {selectedSkin.tier === 'premium_plus' ? 'PREMIUM+' : 'PREMIUM'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handlePurchase} className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded text-xs font-medium flex gap-2">
                <Info className="w-4 h-4 shrink-0" />
                {t('purchase_info')}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('ingame_nick_required')}</label>
                <input
                  type="text"
                  required
                  value={playerNick}
                  onChange={e => setPlayerNick(e.target.value)}
                  placeholder={t('nick_required_placeholder')}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('discord_id_label')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discordId}
                    onChange={e => setDiscordId(e.target.value)}
                    placeholder={t('discord_placeholder')}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  {!user?.discord_username && (
                    <button
                      type="button"
                      onClick={() => window.location.href = `http://127.0.0.1:8000/discord/login?link_token=${localStorage.getItem('access_token')}`}
                      className="whitespace-nowrap flex items-center px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-lg"
                    >
                      {t('auto_fetch')}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('optional_note')}</label>
                <textarea
                  value={optionalNote}
                  onChange={e => setOptionalNote(e.target.value)}
                  placeholder={t('note_placeholder')}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-[#0a0c10] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors resize-none h-20"
                />
              </div>

              <button
                type="submit"
                disabled={purchasing}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg uppercase tracking-wider text-sm transition-all ${purchasing ? 'bg-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 active:scale-95'}`}
              >
                {purchasing ? t('sending') : t('place_order')}
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