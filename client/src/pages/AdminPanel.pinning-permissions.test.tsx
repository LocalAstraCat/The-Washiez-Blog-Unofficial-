// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "./AdminPanel";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "reader-1", name: "Reader", role: "reader" } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button> }));
vi.mock("@/lib/supabase", () => ({
  fetchAdminApplications: vi.fn(), fetchAdminComments: vi.fn(), fetchAdminPosts: vi.fn(), fetchAdminProfiles: vi.fn(), hideComment: vi.fn(), moderatePost: vi.fn(), reviewWriterApplication: vi.fn(), setPinnedPost: vi.fn(), setProfileRole: vi.fn(),
  useSupabaseQuery: () => ({ data: [], isLoading: false, error: undefined, refetch: vi.fn() }),
}));

describe("AdminPanel pinning permissions", () => {
  afterEach(cleanup);

  it("does not expose pin controls to non-admin users", () => {
    render(<AdminPanel />);
    expect(screen.getByText("Admin access only")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /pin|unpin/i })).toBeNull();
  });
});
