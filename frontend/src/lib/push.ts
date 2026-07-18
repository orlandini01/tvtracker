import { api } from "./api";

// Notificação push do navegador. O "opt-in" não é uma preferência guardada
// no perfil (diferente do email) — é a própria existência de uma inscrição
// do Push API do navegador. Por isso o estado "ativado?" é sempre lido na
// hora, perguntando pro navegador (getSubscriptionStatus), nunca guardado
// em cache do React Query como se fosse dado do servidor.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getVapidPublicKey(): Promise<string> {
  const { data } = await api.get<{ public_key: string }>("/push/vapid-public-key");
  return data.public_key;
}

export async function getPushSubscriptionStatus(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

export class PushError extends Error {}

// Retorna true se a inscrição foi criada com sucesso. Lança PushError com
// uma mensagem amigável nos casos esperados (sem suporte do navegador,
// permissão negada, VAPID não configurado no servidor).
export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new PushError("browser_unsupported");
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    throw new PushError("server_not_configured");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new PushError("permission_denied");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  await api.post("/push/subscribe", {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  });
}

export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const json = subscription.toJSON();
  await subscription.unsubscribe();
  await api.post("/push/unsubscribe", {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  });
}
