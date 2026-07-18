// Service worker mínimo. Além de receber push (função original), também
// é o que torna o app instalável como PWA — por isso agora é registrado
// incondicionalmente (ver main.tsx), não só quando o usuário liga push.
// O listener de "fetch" abaixo é só um passthrough (sem cache/offline de
// verdade, que é um projeto à parte): existe porque alguns navegadores
// ainda exigem um service worker com handler de fetch como critério de
// instalabilidade.

self.addEventListener("fetch", () => {
  // Passthrough intencional — sem resposta customizada, o navegador
  // segue com a requisição de rede normalmente.
});

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
