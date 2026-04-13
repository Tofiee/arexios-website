import { useEffect, useRef, useState } from 'react';

export default function useTawkMessenger({ user }) {
  const propertyId = import.meta.env.VITE_TAWK_PROPERTY_ID;
  const widgetId = import.meta.env.VITE_TAWK_WIDGET_ID;
  const scriptLoadedRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const isAvailable = Boolean(propertyId && widgetId);

  useEffect(() => {
    if (!isAvailable || typeof window === 'undefined') return;
    if (scriptLoadedRef.current) return;

    const scriptId = 'tawk-messenger-script';
    if (document.getElementById(scriptId)) {
      scriptLoadedRef.current = true;
      return;
    }

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    window.Tawk_API.onLoad = function() {
      setIsLoaded(true);
      setStatus('online');
      scriptLoadedRef.current = true;
    };

    window.Tawk_API.onStatusChange = function(status) {
      setStatus(status);
    };

    window.Tawk_API.onError = function() {
      setError('Tawk.to yüklenemedi.');
      setStatus('error');
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}/default`;
    script.async = true;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    script.onerror = () => {
      setError('Tawk.to scripti yüklenemedi.');
      setStatus('error');
    };
    document.head.appendChild(script);

    const timeout = setTimeout(() => {
      if (!isLoaded) {
        setError('Tawk.to bağlantısı zaman aşımına uğradı.');
        setStatus('error');
      }
    }, 15000);

    return () => {
      clearTimeout(timeout);
    };
  }, [propertyId, widgetId, isAvailable]);

  useEffect(() => {
    if (isLoaded && user && window.Tawk_API) {
      window.Tawk_API.setAttributes({
        name: user.username,
        email: user.email || '',
        username: user.username,
        provider: user.provider || '',
        ...(user.steam_id ? { steam_id: user.steam_id } : {}),
        ...(user.discord_username ? { discord: user.discord_username } : {}),
      }, (error) => {
        if (error) console.error('Tawk setAttributes error:', error);
      });
    }
  }, [isLoaded, user]);

  const openChat = () => {
    if (window.Tawk_API) {
      window.Tawk_API.showWidget();
      window.Tawk_API.maximize();
    }
  };

  const closeChat = () => {
    if (window.Tawk_API) {
      window.Tawk_API.hideWidget();
    }
  };

  return {
    available: isAvailable,
    ready: isLoaded,
    status,
    error,
    openChat,
    closeChat,
  };
}
