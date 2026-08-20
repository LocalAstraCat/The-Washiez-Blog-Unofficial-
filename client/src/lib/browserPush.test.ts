// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserPushWorkerUrl, createBrowserPushSubscription, vapidPublicKeyBytes } from "./browserPush";

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
const originalPushManager = Object.getOwnPropertyDescriptor(window, "PushManager");
const originalNotification = Object.getOwnPropertyDescriptor(window, "Notification");

function restoreProperty(target: object, key: string, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}

afterEach(() => {
  vi.useRealTimers();
  restoreProperty(navigator, "serviceWorker", originalServiceWorker);
  restoreProperty(window, "PushManager", originalPushManager);
  restoreProperty(window, "Notification", originalNotification);
});

describe("browser push helpers", () => {
  it("keeps the service worker scoped to the GitHub Pages repository base path", () => {
    expect(browserPushWorkerUrl("/The-Washiez-Blog-Unofficial-/")).toBe("/The-Washiez-Blog-Unofficial-/chronicle-push-sw.js");
  });

  it("decodes URL-safe VAPID public key bytes", () => {
    expect([...vapidPublicKeyBytes("AQID")]).toEqual([1, 2, 3]);
    expect([...vapidPublicKeyBytes("-_8")]).toEqual([251, 255]);
  });

  it("waits for the browser notification worker to become active before subscribing", async () => {
    const subscribe = vi.fn().mockResolvedValue({ toJSON: () => ({ endpoint: "https://push.example/subscription", keys: { p256dh: "public-key", auth: "auth-key" } }) });
    const readyRegistration = { active: {}, pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe } };
    const registeringServiceWorker = { active: null, pushManager: { getSubscription: vi.fn(), subscribe: vi.fn() } };
    const register = vi.fn().mockResolvedValue(registeringServiceWorker);

    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register, ready: Promise.resolve(readyRegistration) } });
    Object.defineProperty(window, "PushManager", { configurable: true, value: class PushManager {} });
    Object.defineProperty(window, "Notification", { configurable: true, value: class Notification {} });

    await expect(createBrowserPushSubscription("AQID", "/The-Washiez-Blog-Unofficial-/")).resolves.toEqual({ endpoint: "https://push.example/subscription", p256dhKey: "public-key", authKey: "auth-key" });

    expect(register).toHaveBeenCalledWith("/The-Washiez-Blog-Unofficial-/chronicle-push-sw.js", { scope: "/The-Washiez-Blog-Unofficial-/" });
    expect(registeringServiceWorker.pushManager.getSubscription).not.toHaveBeenCalled();
    expect(readyRegistration.pushManager.getSubscription).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: new Uint8Array([1, 2, 3]) });
  });

  it("fails visibly if service-worker registration never settles instead of leaving alert setup pending", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: vi.fn().mockReturnValue(new Promise(() => {})), ready: new Promise(() => {}) } });
    Object.defineProperty(window, "PushManager", { configurable: true, value: class PushManager {} });
    Object.defineProperty(window, "Notification", { configurable: true, value: class Notification {} });

    const subscriptionAttempt = createBrowserPushSubscription("AQID", "/The-Washiez-Blog-Unofficial-/");
    const timeoutAssertion = expect(subscriptionAttempt).rejects.toThrow("notification worker did not start within 8 seconds");
    await vi.advanceTimersByTimeAsync(8_000);

    await timeoutAssertion;
  });
});
