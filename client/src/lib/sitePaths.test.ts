import { describe, expect, it } from "vitest";
import { sitePath } from "./sitePaths";

describe("sitePath", () => {
  it("keeps ordinary local routes root-relative", () => {
    expect(sitePath("/about", "/")).toBe("/about");
  });

  it("preserves the GitHub Pages repository prefix for internal links", () => {
    expect(sitePath("/about", "/The-Washiez-Blog-Unofficial-/")).toBe("/The-Washiez-Blog-Unofficial-/about");
    expect(sitePath("workspace", "/The-Washiez-Blog-Unofficial-/")).toBe("/The-Washiez-Blog-Unofficial-/workspace");
  });
});
