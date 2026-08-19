import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { postsRouter } from "./posts";

const dbMocks = vi.hoisted(() => ({
  getPostById: vi.fn(),
  setPostStatus: vi.fn(),
}));

vi.mock("../db", () => ({
  getPostById: dbMocks.getPostById,
  setPostStatus: dbMocks.setPostStatus,
}));

function context(role: "user" | "writer" | "admin", id = 8): TrpcContext {
  return {
    user: {
      id,
      openId: `user-${id}`,
      name: "Test user",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("post publishing access", () => {
  it("denies publishing tools to regular readers", async () => {
    const caller = postsRouter.createCaller(context("user"));
    await expect(caller.publish({ id: 24 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("lets a writer publish their own draft", async () => {
    dbMocks.getPostById.mockResolvedValueOnce({ id: 24, authorId: 8, status: "draft" });
    dbMocks.setPostStatus.mockResolvedValueOnce({ id: 24, status: "published" });
    const caller = postsRouter.createCaller(context("writer"));

    await expect(caller.publish({ id: 24 })).resolves.toEqual({ id: 24, status: "published" });
    expect(dbMocks.setPostStatus).toHaveBeenCalledWith(24, "published");
  });
});
