self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/images/logo.jpeg',
    badge: '/images/logo.jpeg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/home'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'KABUSphere', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});