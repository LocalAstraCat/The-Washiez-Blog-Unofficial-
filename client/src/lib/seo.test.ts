import { describe, expect, it } from "vitest";
import { articleDescription, publicUrl, SITE_DESCRIPTION } from "./seo";

describe("public SEO helpers", () => {
  it("builds canonical public URLs with the GitHub Pages repository prefix", () => {
    expect(publicUrl()).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-");
    expect(publicUrl("/about")).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-/about");
    expect(publicUrl("article/washiez-history")).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-/article/washiez-history");
  });

  it("creates concise crawler-friendly article descriptions from Markdown", () => {
    expect(articleDescription("## Hello\n\n**Washiez** update")).toBe("Hello Washiez update");
    expect(articleDescription("")).toBe(SITE_DESCRIPTION);
    expect(articleDescription("x".repeat(190))).toHaveLength(155);
  });
});
