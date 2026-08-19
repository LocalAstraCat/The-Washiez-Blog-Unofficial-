// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTOSAVE_DELAY_MS } from "@/lib/draftRecovery";
import WriterWorkspace from "./WriterWorkspace";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(),
  deleteDraft: vi.fn(),
  fetchMyApplication: vi.fn(),
  fetchMyPosts: vi.fn(),
  publishDraft: vi.fn(),
  submitWriterApplication: vi.fn(),
  updateDraft: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "writer-1", name: "Astra", role: "writer" }, loading: false, isAuthenticated: true, logout: vi.fn() }),
}));

vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => <div>Header</div> }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("wouter", () => ({ useLocation: () => ["/workspace", vi.fn()] }));
vi.mock("@/lib/supabase", () => ({
  createDraft: mocks.createDraft,
  deleteDraft: mocks.deleteDraft,
  fetchMyApplication: mocks.fetchMyApplication,
  fetchMyPosts: mocks.fetchMyPosts,
  publishDraft: mocks.publishDraft,
  submitWriterApplication: mocks.submitWriterApplication,
  updateDraft: mocks.updateDraft,
  useSupabaseQuery: () => ({ data: [], isLoading: false, error: undefined, refetch: mocks.refetch }),
}));

function fillValidPost() {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "A clear Washiez update" } });
  fireEvent.change(screen.getAllByRole("textbox").at(-1)!, { target: { value: "This is a long enough post body for a valid automatic draft save." } });
}

describe("WriterWorkspace autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.createDraft.mockResolvedValue("draft-1");
    mocks.refetch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("waits for the debounce and creates only one first draft", async () => {
    render(<WriterWorkspace />);
    fillValidPost();
    expect(mocks.createDraft).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1); });
    expect(mocks.createDraft).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2); });
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
  });

  it("keeps local recovery available and shows the fallback message when online autosave fails", async () => {
    mocks.createDraft.mockRejectedValueOnce(new Error("Network unavailable"));
    render(<WriterWorkspace />);
    fillValidPost();

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS); });

    expect(screen.getByText("Network unavailable")).toBeTruthy();
    expect(screen.getByText("Saved on this device")).toBeTruthy();
    expect(window.localStorage.getItem("washiez-chronicle:draft:writer-1:new")).toContain("A clear Washiez update");
  });

  it("shows a concise Markdown reference beside the editor fields", () => {
    render(<WriterWorkspace />);
    expect(screen.getByText("Markdown quick help")).toBeTruthy();
    expect(screen.getByText("**important**")).toBeTruthy();
    expect(screen.getByText("[Name](https://example.com)")).toBeTruthy();
  });
});
