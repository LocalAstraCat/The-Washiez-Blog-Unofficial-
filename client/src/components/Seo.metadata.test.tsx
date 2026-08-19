// @vitest-environment jsdom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Seo } from "./Seo";

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
});

describe("public route metadata", () => {
  it("adds canonical, social, and WebSite structured metadata for the homepage", () => {
    render(<Seo />);
    expect(document.title).toBe("The Washiez Chronicle");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-");
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("The Washiez Chronicle");
    expect(document.head.querySelector('meta[name="twitter:description"]')?.getAttribute("content")).toContain("community-maintained reference");
    expect(document.head.querySelector("#chronicle-structured-data")?.textContent).toContain('"@type":"WebSite"');
  });

  it("sets article-specific canonical, social, and BlogPosting metadata", () => {
    render(<Seo title="About Washiez | The Washiez Chronicle" description="A factual overview." path="/article/about-washiez" structuredData={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: "About Washiez" }} />);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-/article/about-washiez");
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("article");
    expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute("content")).toBe("About Washiez | The Washiez Chronicle");
    expect(document.head.querySelector("#chronicle-structured-data")?.textContent).toContain('"@type":"BlogPosting"');
  });
});
