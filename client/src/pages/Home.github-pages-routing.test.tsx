// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import Home from "./Home";

vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => <div>Header</div> }));
vi.mock("@/components/ArticleCard", () => ({ ArticleCard: () => <article>Post card</article> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.ComponentProps<"input">) => <input {...props} /> }));
vi.mock("@/lib/supabase", () => ({ fetchPublishedPosts: vi.fn(), useSupabaseQuery: () => ({ data: [], isLoading: false, error: undefined, refetch: vi.fn() }) }));

describe("Home GitHub Pages navigation", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("keeps the repository prefix when the Guidelines link is clicked", () => {
    window.history.replaceState({}, "", "/The-Washiez-Blog-Unofficial-/");
    render(<Router base="/The-Washiez-Blog-Unofficial-"><Home /></Router>);

    const guidelines = screen.getByText("How we write");
    expect(guidelines.getAttribute("href")).toBe("/The-Washiez-Blog-Unofficial-/about");
    fireEvent.click(guidelines);
    expect(window.location.pathname).toBe("/The-Washiez-Blog-Unofficial-/about");
  });
});
