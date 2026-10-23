/*
 * Shows HandiMart pushes (Firebase Cloud Messaging, web push) while the seller site is closed,
 * and opens the site on a tap. No Firebase SDK here: FCM delivers its JSON message
 * ({ notification: { title, body }, data }) as the push payload, and this reads it directly.
 * While a tab is open and focused, the page shows pushes itself, so nothing is shown twice.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  const n = message.notification || {};
  const data = message.data || {};
  const title = n.title || data.title;
  if (!title) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      if (tabs.some((t) => t.focused)) return;
      return self.registration.showNotification(title, {
        body: n.body || data.body || "",
        icon: "/apple-icon.png",
        badge: "/apple-icon.png",
        lang: "ar",
        dir: "rtl",
        tag: data.notificationId || undefined,
        data: { url: "/notifications?from=push" },
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((t) => new URL(t.url).origin === self.location.origin);
      if (tab) return tab.focus().then((t) => t && t.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
