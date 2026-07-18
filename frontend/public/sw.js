// Service worker mínimo só pra receber push do navegador e mostrar a
// notificação nativa do sistema — não faz cache de assets nem funciona
// como PWA offline (isso é um projeto separado, não o objetivo aqui).

self.addEventListener("push", (event) => {
  let payload = { title: "TrackerTV", body: "Você tem uma novidade.", url: "/" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (err) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.svg",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
