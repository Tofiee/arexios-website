import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Globe, Menu, X, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user } = React.useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const toggleLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            {/* Logo placeholder */}
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              A
            </div>
            <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">
              Arexios<span className="text-indigo-500">Portal</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 dark:text-gray-300 font-bold hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider text-sm">
              {t('home')}
            </Link>
            <Link to="/stats" className="text-gray-600 dark:text-gray-300 font-bold hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider text-sm">
              {t('stats')}
            </Link>
            <Link to="/market" className="text-gray-600 dark:text-gray-300 font-bold hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider text-sm">
              {t('market')}
            </Link>
            <Link to="/premium-market" className="text-orange-600 dark:text-orange-400 font-bold hover:text-orange-500 dark:hover:text-orange-300 transition-colors uppercase tracking-wider text-sm">
              Premium Market
            </Link>
            
            <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors font-medium focus:outline-none"
              >
                <Globe className="w-5 h-5" />
                <span>{i18n.language.toUpperCase()}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isLangMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                  <button onClick={() => toggleLanguage('tr')} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium">Türkçe</button>
                  <button onClick={() => toggleLanguage('en')} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium">English</button>
                </div>
              )}
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 hover:rotate-12 focus:outline-none"
              aria-label={t('theme')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>

            {user ? (
              <Link to="/profile" className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-emerald-500/30 hover:-translate-y-0.5 focus:outline-none">
                {user.username}
              </Link>
            ) : (
              <Link to="/login" className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-indigo-500/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
                {t('login')}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl">
          <div className="px-4 pt-4 pb-6 space-y-4 shadow-xl flex flex-col">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-center font-bold text-gray-700 dark:text-gray-200 py-2 border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest">{t('home')}</Link>
            <Link to="/stats" onClick={() => setIsMobileMenuOpen(false)} className="text-center font-bold text-gray-700 dark:text-gray-200 py-2 border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest">{t('stats')}</Link>
            <Link to="/market" onClick={() => setIsMobileMenuOpen(false)} className="text-center font-bold text-gray-700 dark:text-gray-200 py-2 border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest">{t('market')}</Link>
            <Link to="/premium-market" onClick={() => setIsMobileMenuOpen(false)} className="text-center font-bold text-orange-600 dark:text-orange-400 py-2 border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest">Premium Market</Link>
            
            <div className="flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mt-2">
              <button 
                onClick={() => toggleLanguage('tr')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${i18n.language === 'tr' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                TR
              </button>
              <button 
                onClick={() => toggleLanguage('en')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${i18n.language === 'en' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                EN
              </button>
            </div>
            {user ? (
              <Link to="/profile" className="w-full flex items-center justify-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold transition-all">
                {user.username}
              </Link>
            ) : (
              <Link to="/login" className="w-full flex items-center justify-center py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold transition-all">
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
