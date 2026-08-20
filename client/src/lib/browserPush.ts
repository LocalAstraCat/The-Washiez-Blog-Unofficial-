export type BrowserPushSubscription = { endpoint: string; p256dhKey: string; authKey: string };

export function browserPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function browserPushWorkerUrl(baseUrl: string) {
  return `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}chronicle-push-sw.js`;
}

export function vapidPublicKeyBytes(value: string) {
  const padded = `${value.replace(/-/g, "+").replace(/_/g, "/")}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function serialize(subscription: PushSubscription): BrowserPushSubscription {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Your browser did not return a complete push subscription.");
  return { endpoint: json.endpoint, p256dhKey: json.keys.p256dh, authKey: json.keys.auth };
}

const WORKER_READY_TIMEOUT_MS = 8_000;

function waitForActiveBrowserPushWorker() {
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Chronicle’s notification worker did not start within 8 seconds. Reload the page once, then try again. If it still fails, copy the technical details below and send them to the site owner.")), WORKER_READY_TIMEOUT_MS);
    navigator.serviceWorker.ready.then(
      (registration) => {
        window.clearTimeout(timeout);
        resolve(registration);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function readyBrowserPushRegistration(baseUrl: string) {
  const registration = await navigator.serviceWorker.register(browserPushWorkerUrl(baseUrl), { scope: baseUrl });
  if (registration.active) return registration;

  const readyRegistration = await waitForActiveBrowserPushWorker();
  if (!readyRegistration.active) {
    throw new Error("Chronicle’s notification worker did not finish starting. Please reload the page and try again.");
  }
  return readyRegistration;
}

export async function createBrowserPushSubscription(vapidPublicKey: string, baseUrl: string) {
  if (!browserPushSupported()) throw new Error("This browser does not support push notifications.");
  const registration = await readyBrowserPushRegistration(baseUrl);
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKeyBytes(vapidPublicKey) });
  return serialize(subscription);
}

export async function removeBrowserPushSubscription(baseUrl: string) {
  if (!browserPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(baseUrl);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  const serialized = serialize(subscription);
  await subscription.unsubscribe();
  return serialized;
}
