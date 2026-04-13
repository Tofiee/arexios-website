const CACHE_NAME = 'arexios-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  let data = {
    title: 'Arexios Destek',
    body: 'Yeni bir destek talebi var!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'support-notification',
    renotify: true,
    requireInteraction: true,
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data.title = payload.title || data.title;
      data.body = payload.body || data.body;
      data.data = payload.data || {};
      if (payload.icon) data.icon = payload.icon;
      if (payload.badge) data.badge = payload.badge;
      if (payload.tag) data.tag = payload.tag;
      if (payload.vibrate) data.vibrate = payload.vibrate;
      if (payload.actions) data.actions = payload.actions;
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, data)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification click:', event);
  event.notification.close();

  const data = event.notification.data || {};
  
  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.focus();
          if (data.session_id) {
            client.postMessage({
              type: 'OPEN_SESSION',
              session_id: data.session_id,
              user_name: data.user_name
            });
          }
          return;
        }
      }
      
      if (clients.openWindow) {
        let url = '/admin';
        if (data.session_id) {
          url += `?session=${data.session_id}`;
        }
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
