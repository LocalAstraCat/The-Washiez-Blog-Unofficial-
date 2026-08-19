self.addEventListener("push", (event) => {
  let payload = { title: "Chronicle staff mention", body: "You were mentioned in staff chat.", url: "chat" };
  try { payload = { ...payload, ...event.data?.json() }; } catch { /* A plain fallback notification is still useful. */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "favicon.svg",
    badge: "favicon.svg",
    tag: payload.tag || "chronicle-staff-mention",
    data: { url: payload.url || "chat" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "chat", self.registration.scope).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
