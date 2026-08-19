import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { canManagePost, canWrite, type SiteRole } from "../permissions";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const postFields = z.object({
  title: z.string().trim().min(4).max(220),
  body: z.string().trim().min(20).max(50000),
  coverImageUrl: z.string().url().max(2048).nullable().optional(),
  category: z.string().trim().min(2).max(64),
  tags: z.array(z.string().trim().min(2).max(32)).max(6),
});

function requireWriter(role: SiteRole) {
  if (!canWrite(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Writer access is required." });
  }
}

async function requireEditablePost(postId: number, user: { id: number; role: SiteRole }) {
  const post = await db.getPostById(postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
  if (!canManagePost(user.role, post.authorId, user.id)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You cannot edit this post." });
  }
  return post;
}

export const postsRouter = router({
  list: publicProcedure
    .input(z.object({ search: z.string().trim().max(120).optional(), category: z.string().trim().max(64).optional(), tag: z.string().trim().max(32).optional() }).optional())
    .query(({ input }) => db.listPublishedPosts(input ?? {})),
  categories: publicProcedure.query(() => db.listPublicCategories()),
  tags: publicProcedure.query(() => db.listPublicTags()),
  bySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(200) })).query(async ({ input }) => {
    const post = await db.getPublishedPostBySlug(input.slug);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "This article is unavailable." });
    return post;
  }),
  mine: protectedProcedure.query(async ({ ctx }) => {
    requireWriter(ctx.user.role as SiteRole);
    return db.listPostsByAuthor(ctx.user.id);
  }),
  create: protectedProcedure.input(postFields).mutation(async ({ ctx, input }) => {
    requireWriter(ctx.user.role as SiteRole);
    return db.createPost({ ...input, coverImageUrl: input.coverImageUrl ?? null, authorId: ctx.user.id });
  }),
  update: protectedProcedure.input(postFields.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireWriter(ctx.user.role as SiteRole);
    await requireEditablePost(input.id, { id: ctx.user.id, role: ctx.user.role as SiteRole });
    const { id, ...fields } = input;
    return db.updatePost(id, { ...fields, coverImageUrl: fields.coverImageUrl ?? null });
  }),
  publish: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireWriter(ctx.user.role as SiteRole);
    await requireEditablePost(input.id, { id: ctx.user.id, role: ctx.user.role as SiteRole });
    return db.setPostStatus(input.id, "published");
  }),
  deleteDraft: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireWriter(ctx.user.role as SiteRole);
    const post = await requireEditablePost(input.id, { id: ctx.user.id, role: ctx.user.role as SiteRole });
    if (post.status === "published") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Published articles must be moderated from the admin area." });
    }
    await db.deletePost(input.id);
    return { success: true } as const;
  }),
});
