import { execFile, execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../..");
const execFileAsync = promisify(execFile);

describe("crawler files", () => {
  it("allows crawling and names the canonical GitHub Pages sitemap in robots.txt", () => {
    const robots = readFileSync(resolve(projectRoot, "client/public/robots.txt"), "utf8");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Sitemap: https://localastracat.github.io/The-Washiez-Blog-Unofficial-/sitemap.xml");
  });

  it("generates valid root and Guidelines sitemap entries when no post source is supplied", () => {
    const output = resolve(projectRoot, "dist/public/sitemap.xml");
    rmSync(output, { force: true });
    execFileSync(process.execPath, ["scripts/generate-sitemap.mjs"], {
      cwd: projectRoot,
      env: { PATH: process.env.PATH ?? "" },
    });
    const sitemap = readFileSync(output, "utf8");
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain("<urlset");
    expect(sitemap).toContain("https://localastracat.github.io/The-Washiez-Blog-Unofficial-/</loc>");
    expect(sitemap).toContain("https://localastracat.github.io/The-Washiez-Blog-Unofficial-/about</loc>");
  });

  it("adds a published article URL and timestamp from the Supabase response", async () => {
    const server = createServer((_request, response) => {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify([{ slug: "about-washiez", updated_at: "2026-08-19T20:00:00.000Z", published_at: "2026-08-19T19:00:00.000Z" }]));
    });
    await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const port = (server.address() as AddressInfo).port;
    try {
      await execFileAsync(process.execPath, ["scripts/generate-sitemap.mjs"], { cwd: projectRoot, env: { ...process.env, VITE_SUPABASE_URL: `http://127.0.0.1:${port}`, VITE_SUPABASE_ANON_KEY: "test-key" } });
      const sitemap = readFileSync(resolve(projectRoot, "dist/public/sitemap.xml"), "utf8");
      expect(sitemap).toContain("/article/about-washiez</loc>");
      expect(sitemap).toContain("<lastmod>2026-08-19T20:00:00.000Z</lastmod>");
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });
});
