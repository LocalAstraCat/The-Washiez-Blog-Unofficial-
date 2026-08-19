import { describe, expect, it } from "vitest";
import { browserPushWorkerUrl, vapidPublicKeyBytes } from "./browserPush";

describe("browser push helpers", () => {
  it("keeps the service worker scoped to the GitHub Pages repository base path", () => {
    expect(browserPushWorkerUrl("/The-Washiez-Blog-Unofficial-/")).toBe("/The-Washiez-Blog-Unofficial-/chronicle-push-sw.js");
  });

  it("decodes URL-safe VAPID public key bytes", () => {
    expect([...vapidPublicKeyBytes("AQID")]).toEqual([1, 2, 3]);
    expect([...vapidPublicKeyBytes("-_8")]).toEqual([251, 255]);
  });
});
