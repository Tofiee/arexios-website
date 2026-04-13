import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const PushContext = createContext();

export function PushProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      registerServiceWorker();
    } else {
      setPushSupported(false);
      setLoading(false);
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New Service Worker available');
          }
        });
      });

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      await checkExistingSubscription(registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceWorkerMessage = (event) => {
    console.log('SW Message received:', event.data);
    if (event.data.type === 'PUSH_RECEIVED') {
      console.log('Push received in app:', event.data);
    }
  };

  const checkExistingSubscription = async (registration) => {
    try {
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setSubscription(existing);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribeToPush = async (adminId) => {
    if (!pushSupported) {
      console.error('Push not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const res = await api.get('/push/vapid-public-key');
      const publicKey = res.data.publicKey;
      
      console.log('VAPID Public Key:', publicKey);
      console.log('Key bytes:', urlBase64ToUint8Array(publicKey));

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      console.log('Subscription created:', sub);
      console.log('Subscription JSON:', JSON.stringify(sub));
      
      const jsonSub = sub.toJSON();
      console.log('Subscription toJSON:', jsonSub);

      if (!jsonSub.keys || !jsonSub.keys.p256dh || !jsonSub.keys.auth) {
        console.error('Invalid subscription keys:', jsonSub.keys);
        return false;
      }

      await api.post('/push/subscribe', {
        endpoint: jsonSub.endpoint,
        keys: {
          p256dh: jsonSub.keys.p256dh,
          auth: jsonSub.keys.auth
        },
        admin_id: adminId
      });

      setSubscription(sub);
      console.log('Push subscribed successfully');
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  };

  const unsubscribeFromPush = async (adminId) => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/push/unsubscribe', { admin_id: adminId });
        setSubscription(null);
      }
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  };

  const testPush = async (adminId) => {
    try {
      await api.post(`/push/test/${adminId}`);
      return true;
    } catch (error) {
      console.error('Test push failed:', error);
      return false;
    }
  };

  return (
    <PushContext.Provider value={{
      subscription,
      pushSupported,
      loading,
      subscribeToPush,
      unsubscribeFromPush,
      testPush
    }}>
      {children}
    </PushContext.Provider>
  );
}

export function usePush() {
  return useContext(PushContext);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
