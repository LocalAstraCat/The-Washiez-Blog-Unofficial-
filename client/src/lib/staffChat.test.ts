import { describe, expect, it } from "vitest";
import { canAccessStaffChatRoom, canManageChatPins, chatMentionRoles, isExpiredUnpinnedChatMessage, messageMentionsViewer, normalizeChatSearch } from "./staffChat";

describe("staff chat rules", () => {
  it("allows only writers and admins into the writer room, and only admins into the admin room", () => {
    expect(canAccessStaffChatRoom("user", "writers")).toBe(false);
    expect(canAccessStaffChatRoom("writer", "writers")).toBe(true);
    expect(canAccessStaffChatRoom("writer", "admins")).toBe(false);
    expect(canAccessStaffChatRoom("admin", "writers")).toBe(true);
    expect(canAccessStaffChatRoom("admin", "admins")).toBe(true);
  });

  it("reserves message pinning for administrators", () => {
    expect(canManageChatPins("user")).toBe(false);
    expect(canManageChatPins("writer")).toBe(false);
    expect(canManageChatPins("admin")).toBe(true);
  });

  it("marks only unpinned messages older than three calendar months for removal", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    expect(isExpiredUnpinnedChatMessage({ createdAt: "2026-05-18T11:59:59.000Z", isPinned: false }, now)).toBe(true);
    expect(isExpiredUnpinnedChatMessage({ createdAt: "2026-05-19T12:00:00.000Z", isPinned: false }, now)).toBe(false);
    expect(isExpiredUnpinnedChatMessage({ createdAt: "2020-01-01T00:00:00.000Z", isPinned: true }, now)).toBe(false);
  });

  it("detects role mentions and marks only the intended viewer", () => {
    expect(chatMentionRoles("Please check this, @admins and @owner.")).toEqual(["admins", "owner"]);
    expect(chatMentionRoles("Not a mention: hello@admins")).toEqual([]);
    expect(messageMentionsViewer({ body: "@authors, source check?" }, { id: "writer-1", role: "writer" }, "owner-1")).toBe(true);
    expect(messageMentionsViewer({ body: "@authors, source check?" }, { id: "reader-1", role: "user" }, "owner-1")).toBe(false);
    expect(messageMentionsViewer({ body: "@owner, please look" }, { id: "owner-1", role: "admin" }, "owner-1")).toBe(true);
    expect(messageMentionsViewer({ body: "@owner, please look" }, { id: "admin-2", role: "admin" }, "owner-1")).toBe(false);
  });

  it("normalizes room search terms without growing unbounded", () => {
    expect(normalizeChatSearch("  washiez   timeline  ")).toBe("washiez timeline");
    expect(normalizeChatSearch("x".repeat(150))).toHaveLength(120);
  });
});
