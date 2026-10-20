// Loop · browser notifications (WBrowserNotif). The buttons need a service worker:
// "Move all to today" and "Decide in Loop" are passed to the open Loop tab.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action === 'all' ? 'checkin-all' : 'checkin-open';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const tab = list[0];
      if (tab) {
        tab.postMessage({ type: action });
        return tab.focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
