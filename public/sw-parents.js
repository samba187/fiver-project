// Service worker de l'Espace Parents : affiche les notifications envoyées par l'académie.
self.addEventListener("push", event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || "Fiveur Academy", {
    body: d.body || "",
    icon: "/images/parents-icon-192.png",
    badge: "/images/parents-icon-192.png",
    data: { url: d.url || "/espace-parents" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/espace-parents";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(fenetres => {
    for (const f of fenetres) if (f.url.includes("/espace-parents") && "focus" in f) return f.focus();
    return clients.openWindow(url);
  }));
});
