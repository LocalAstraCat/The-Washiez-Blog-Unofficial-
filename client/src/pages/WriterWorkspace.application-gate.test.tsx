// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import WriterWorkspace from "./WriterWorkspace";

const mocks = vi.hoisted(() => ({
  auth: { user: null as { id: string; name: string; role: "reader" } | null, loading: false, isAuthenticated: false },
  refetch: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => <div>Header</div> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.ComponentProps<"input">) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} /> }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/supabase", () => ({
  createDraft: vi.fn(), deleteDraft: vi.fn(), fetchMyApplication: vi.fn(), fetchMyPosts: vi.fn(), publishDraft: vi.fn(), submitWriterApplication: vi.fn(), updateDraft: vi.fn(),
  useSupabaseQuery: () => ({ data: null, isLoading: false, error: undefined, refetch: mocks.refetch }),
}));

describe("WriterWorkspace application gate", () => {
  beforeEach(() => { mocks.auth = { user: null, loading: false, isAuthenticated: false }; });
  afterEach(cleanup);

  it("explains the sign-in step to signed-out visitors", () => {
    render(<Router><WriterWorkspace /></Router>);
    expect(screen.getByText("Writers only")).toBeTruthy();
    expect(screen.getByText(/Sign in first, then come back here to apply/i)).toBeTruthy();
  });

  it("shows the writer application form to signed-in non-writers", () => {
    mocks.auth = { user: { id: "reader-1", name: "Reader", role: "reader" }, loading: false, isAuthenticated: true };
    render(<Router><WriterWorkspace /></Router>);
    expect(screen.getByText("Apply to write")).toBeTruthy();
    expect(screen.getByPlaceholderText("Write at least 50 characters…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send application" })).toBeTruthy();
  });
});
