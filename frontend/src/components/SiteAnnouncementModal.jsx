import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const ANNOUNCEMENT_DISMISSED_KEY = 'announcement_dismissed';

const SiteAnnouncementModal = () => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const dismissedId = localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY);
        const res = await api.get('/admin/announcements');
        
        const activeAnnouncement = res.data?.find(a => a.is_active);
        
        if (activeAnnouncement) {
          if (dismissedId !== String(activeAnnouncement.id)) {
            setAnnouncement(activeAnnouncement);
            setShowModal(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch announcement:', err);
      }
    };

    fetchAnnouncement();
  }, []);

  const handleDismiss = () => {
    setShowModal(false);
    if (announcement?.id) {
      localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, String(announcement.id));
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  if (!showModal || !announcement) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-[#151822] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{announcement.title || t('site_announcement')}</h3>
              <p className="text-orange-100 text-xs">{t('important_notice')}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </p>
          </div>
        </div>

        <div className="p-4 pt-0 flex justify-end">
          <button
            onClick={handleDismiss}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            {t('i_understand')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteAnnouncementModal;
