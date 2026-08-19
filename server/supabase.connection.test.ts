import { describe, expect, it } from "vitest";

describe("Supabase public connection", () => {
  it("authenticates a lightweight settings request with the configured publishable key", async () => {
    const projectUrl = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_ANON_KEY;

    expect(projectUrl).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(publishableKey).toBeTruthy();

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey! },
    });

    expect(response.ok).toBe(true);
  }, 15000);

  it("has the direct database credential available for the reviewed schema migration", () => {
    expect(process.env.SUPABASE_DB_PASSWORD).toBeTruthy();
    expect(process.env.SUPABASE_DB_PASSWORD!.length).toBeGreaterThanOrEqual(8);
  });
});
