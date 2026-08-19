// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffChat from "./StaffChat";

const mocks = vi.hoisted(() => ({
  auth: { loading: false, isAuthenticated: false, user: null as { id: string; name: string; role: "user" | "writer" | "admin" } | null },
  createChatMessage: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => <header>Header</header> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.ComponentProps<"input">) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} /> }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/supabase", () => ({
  createChatMessage: mocks.createChatMessage, fetchChatMessages: vi.fn(), fetchChatOwnerId: vi.fn(), fetchNotificationPreferences: vi.fn(), fetchPushVapidPublicKey: vi.fn(), removePushSubscription: vi.fn(), saveNotificationPreferences: vi.fn(), savePushSubscription: vi.fn(), setChatMessagePinned: vi.fn(), subscribeToChatRoom: () => () => {},
  useSupabaseQuery: () => ({ data: [], isLoading: false, error: undefined, refetch: mocks.refetch }),
}));

describe("StaffChat access", () => {
  beforeEach(() => { mocks.auth = { loading: false, isAuthenticated: false, user: null }; mocks.createChatMessage.mockReset(); mocks.refetch.mockReset(); });
  afterEach(cleanup);

  it("guides signed-out visitors to sign in without exposing room content", () => {
    mocks.auth = { loading: false, isAuthenticated: false, user: null };
    render(<StaffChat />);
    expect(screen.getByText("Staff rooms only")).toBeTruthy();
    expect(screen.queryByText("Writer room")).toBeNull();
  });

  it("keeps readers outside staff rooms", () => {
    mocks.auth = { loading: false, isAuthenticated: true, user: { id: "reader-1", name: "Reader", role: "user" } };
    render(<StaffChat />);
    expect(screen.getByText("Writer or admin access needed")).toBeTruthy();
    expect(screen.queryByText("Admin room")).toBeNull();
  });

  it("gives writers the writer room but not the admin room or pin controls", () => {
    mocks.auth = { loading: false, isAuthenticated: true, user: { id: "writer-1", name: "Writer", role: "writer" } };
    render(<StaffChat />);
    expect(screen.getAllByText("Writer room").length).toBeGreaterThan(0);
    expect(screen.queryByText("Admin room")).toBeNull();
    expect(screen.queryByRole("button", { name: /^pin$|^unpin$/i })).toBeNull();
  });

  it("sends a writer message with Enter while preserving Shift+Enter for a new line", async () => {
    mocks.auth = { loading: false, isAuthenticated: true, user: { id: "writer-1", name: "Writer", role: "writer" } };
    render(<StaffChat />);
    const composer = screen.getByPlaceholderText(/message writer room/i);
    fireEvent.change(composer, { target: { value: "@authors, please check the timeline" } });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(mocks.createChatMessage).toHaveBeenCalledWith("writers", "@authors, please check the timeline"));
  });
});
