// JKA Bangladesh — Web Push service worker.
// Registered from lib/push/client.ts. Keep this file at /sw.js so the
// scope is the whole origin.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "JKA Bangladesh", body: "", link: "/portal/notifications" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: "/assets/jka_logo.svg",
    badge: "/assets/jka_logo.svg",
    tag: payload.tag || undefined,
    data: { link: payload.link || "/portal/notifications" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/portal/notifications";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const origin = self.location.origin;
      for (const client of all) {
        if (client.url.startsWith(origin)) {
          client.focus();
          if ("navigate" in client) client.navigate(origin + link);
          return;
        }
      }
      await self.clients.openWindow(origin + link);
    })()
  );
});
