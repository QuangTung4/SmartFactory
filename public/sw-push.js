/* SmartFactory Web Push — chat notifications */
self.addEventListener("push", (event) => {
  let title = "Chat sự cố";
  let body = "";
  let data = {};
  try {
    const payload = event.data ? event.data.json() : {};
    title = payload.title || title;
    body = payload.body || "";
    data = payload.data || {};
  } catch {
    body = event.data ? event.data.text() : "";
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: "/placeholder.svg",
      badge: "/placeholder.svg",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const incidentId = event.notification.data?.incidentId;
  const url = incidentId
    ? `/manager/incidents?incident=${encodeURIComponent(incidentId)}`
    : "/manager/incidents";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
