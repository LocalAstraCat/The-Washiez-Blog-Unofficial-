import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const communityRouter = router({
  application: router({
    mine: protectedProcedure.query(({ ctx }) => db.getWriterApplication(ctx.user.id)),
    submit: protectedProcedure.input(z.object({ motivation: z.string().trim().min(50).max(1500) })).mutation(async ({ ctx, input }) => {
      return db.submitWriterApplication(ctx.user.id, input.motivation);
    }),
  }),
  comments: router({
    list: publicProcedure.input(z.object({ postId: z.number().int().positive() })).query(({ input }) => db.listVisibleComments(input.postId)),
    create: protectedProcedure.input(z.object({ postId: z.number().int().positive(), body: z.string().trim().min(2).max(2000) })).mutation(async ({ ctx, input }) => {
      const post = await db.getPostById(input.postId);
      if (!post || post.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "This article is unavailable for discussion." });
      }
      return db.createComment({ authorId: ctx.user.id, postId: input.postId, body: input.body });
    }),
  }),
  votes: router({
    summary: publicProcedure.input(z.object({ postId: z.number().int().positive() })).query(({ input }) => db.getVoteSummary(input.postId)),
    set: protectedProcedure.input(z.object({ postId: z.number().int().positive(), value: z.union([z.literal(1), z.literal(-1)]) })).mutation(async ({ ctx, input }) => {
      const post = await db.getPostById(input.postId);
      if (!post || post.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "This article is unavailable for voting." });
      }
      await db.setVote({ postId: input.postId, userId: ctx.user.id, value: input.value });
      return db.getVoteSummary(input.postId);
    }),
  }),
});
