// @vitest-environment jsdom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryResults: [] as unknown[], refetch: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false, user: undefined, loading: false }) }));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => <header>Header</header> }));
vi.mock("@/components/ArticleCard", () => ({ ArticleCard: () => <article>Post card</article> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.ComponentProps<"input">) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} /> }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("wouter", () => ({ Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>, useRoute: () => [true, { slug: "about-washiez" }], useLocation: () => ["/article/about-washiez", vi.fn()] }));
vi.mock("@/lib/supabase", () => ({
  castVote: vi.fn(), createComment: vi.fn(), fetchComments: vi.fn(), fetchPublishedPost: vi.fn(), fetchPublishedPosts: vi.fn(), fetchVoteSummary: vi.fn(), useSupabaseQuery: () => ({ data: mocks.queryResults.shift() ?? [], isLoading: false, error: undefined, refetch: mocks.refetch }),
}));

import Home from "./Home";
import ArticlePage from "./ArticlePage";
import EditorialPolicy from "./EditorialPolicy";

afterEach(() => { cleanup(); document.head.innerHTML = ""; });
beforeEach(() => { mocks.queryResults = []; });

const post = { id: "post-1", slug: "about-washiez", title: "About Washiez", body: "## A source-led overview", category: "History", tags: ["About"], coverImageUrl: null, status: "published" as const, isPinned: false, authorId: "author-1", authorName: "astra", createdAt: "2026-08-19T19:00:00.000Z", updatedAt: "2026-08-19T20:00:00.000Z", publishedAt: "2026-08-19T19:00:00.000Z" };

describe("public route SEO metadata", () => {
  it("wires homepage WebSite metadata through the archive route", () => {
    render(<Home />);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-");
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("The Washiez Chronicle");
    expect(document.head.querySelector("#chronicle-structured-data")?.textContent).toContain('"@type":"WebSite"');
  });

  it("wires BlogPosting metadata through an individual article route", () => {
    mocks.queryResults = [post, { score: 0, total: 0 }, []];
    render(<ArticlePage />);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-/article/about-washiez");
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("article");
    expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute("content")).toBe("About Washiez | The Washiez Chronicle");
    expect(document.head.querySelector("#chronicle-structured-data")?.textContent).toContain('"@type":"BlogPosting"');
  });

  it("wires Guidelines-specific canonical and description metadata", () => {
    render(<EditorialPolicy />);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://localastracat.github.io/The-Washiez-Blog-Unofficial-/about");
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toContain("contributors to use sources");
  });
});
