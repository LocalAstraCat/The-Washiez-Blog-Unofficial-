import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { isAdministrator, type SiteRole } from "../permissions";
import { protectedProcedure, router } from "../_core/trpc";

function requireAdmin(role: SiteRole) {
  if (!isAdministrator(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner moderation access is required." });
  }
}

export const adminRouter = router({
  users: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role as SiteRole);
    return db.listUsersForAdmin();
  }),
  setRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "writer", "admin"]) })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role as SiteRole);
    return db.setUserRole(input.userId, input.role);
  }),
  applications: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role as SiteRole);
    return db.listWriterApplications();
  }),
  reviewApplication: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role as SiteRole);
    return db.reviewWriterApplication(input.id, input.status);
  }),
  posts: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role as SiteRole);
    return db.listPostsForAdmin();
  }),
  comments: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role as SiteRole);
    return db.listCommentsForAdmin();
  }),
  moderatePost: protectedProcedure.input(z.object({ id: z.number().int().positive(), action: z.enum(["unpublish", "delete"]) })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role as SiteRole);
    if (input.action === "delete") {
      await db.deletePost(input.id);
      return { success: true } as const;
    }
    return db.setPostStatus(input.id, "unpublished");
  }),
  hideComment: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role as SiteRole);
    return db.hideComment(input.id);
  }),
});
