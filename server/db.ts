import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { comments, postTags, postVotes, posts, tags, users, writerApplications, type InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb(database: Awaited<ReturnType<typeof getDb>>) {
  if (!database) throw new Error("Database is unavailable.");
  return database;
}

function slugify(value: string) {
  const cleaned = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 175) || "article";
}

function normalizeTags(input: string[]) {
  const seen = new Set<string>();
  return input.reduce<string[]>((result, tag) => {
    const name = tag.trim().replace(/\s+/g, " ");
    const slug = slugify(name);
    if (name && slug && !seen.has(slug)) {
      seen.add(slug);
      result.push(name.slice(0, 32));
    }
    return result;
  }, []).slice(0, 6);
}

function makeExcerpt(body: string) {
  const compact = body.replace(/[#*_>`\[\]()]/g, " ").replace(/\s+/g, " ").trim();
  return compact.length > 170 ? `${compact.slice(0, 167)}…` : compact;
}

async function tagsForPostIds(database: NonNullable<Awaited<ReturnType<typeof getDb>>>, ids: number[]) {
  const grouped: Record<number, string[]> = {};
  if (!ids.length) return grouped;
  const rows = await database
    .select({ postId: postTags.postId, name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, ids));
  for (const row of rows) {
    (grouped[row.postId] ??= []).push(row.name);
  }
  return grouped;
}

async function replacePostTags(database: NonNullable<Awaited<ReturnType<typeof getDb>>>, postId: number, rawTags: string[]) {
  await database.delete(postTags).where(eq(postTags.postId, postId));
  for (const name of normalizeTags(rawTags)) {
    const slug = slugify(name);
    await database.insert(tags).values({ name, slug }).onDuplicateKeyUpdate({ set: { name } });
    const [tag] = await database.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    if (tag) {
      await database.insert(postTags).values({ postId, tagId: tag.id }).onDuplicateKeyUpdate({ set: { postId } });
    }
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const database = await getDb();
  if (!database) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await database.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const database = await getDb();
  if (!database) return undefined;
  const result = await database.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listPublishedPosts(filters: { search?: string; category?: string; tag?: string }) {
  const database = requireDb(await getDb());
  const joined = await database
    .select()
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
  const rows = joined.map(({ posts: post, users: author }) => ({ ...post, authorName: author?.name ?? null }));
  const tagsByPost = await tagsForPostIds(database, rows.map((post) => post.id));
  const query = filters.search?.toLocaleLowerCase();
  const requestedTag = filters.tag ? slugify(filters.tag) : undefined;
  return rows
    .map((post) => ({ ...post, tags: tagsByPost[post.id] ?? [], excerpt: makeExcerpt(post.body) }))
    .filter((post) => !filters.category || post.category === filters.category)
    .filter((post) => !requestedTag || post.tags.some((tag) => slugify(tag) === requestedTag))
    .filter((post) => !query || `${post.title} ${post.body} ${post.category} ${post.tags.join(" ")}`.toLowerCase().includes(query));
}

export async function getPublishedPostBySlug(slug: string) {
  const database = requireDb(await getDb());
  const joined = await database
    .select()
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);
  const row = joined[0];
  const post = row ? { ...row.posts, authorName: row.users?.name ?? null } : undefined;
  if (!post) return undefined;
  const tagsByPost = await tagsForPostIds(database, [post.id]);
  return { ...post, tags: tagsByPost[post.id] ?? [] };
}

export async function getPostById(id: number) {
  const database = requireDb(await getDb());
  const rows = await database.select().from(posts).where(eq(posts.id, id)).limit(1);
  return rows[0];
}

export async function listPublicCategories() {
  const database = requireDb(await getDb());
  const rows = await database.selectDistinct({ category: posts.category }).from(posts).where(eq(posts.status, "published"));
  return rows.map((row) => row.category).sort((a, b) => a.localeCompare(b));
}

export async function listPublicTags() {
  const database = requireDb(await getDb());
  const rows = await database
    .selectDistinct({ name: tags.name, slug: tags.slug })
    .from(tags)
    .innerJoin(postTags, eq(postTags.tagId, tags.id))
    .innerJoin(posts, eq(posts.id, postTags.postId))
    .where(eq(posts.status, "published"));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPost(input: { authorId: number; title: string; body: string; coverImageUrl: string | null; category: string; tags: string[] }) {
  const database = requireDb(await getDb());
  const slug = `${slugify(input.title)}-${nanoid(7).toLowerCase()}`;
  const result = await database.insert(posts).values({ ...input, slug, status: "draft" });
  const postId = Number(result[0].insertId);
  await replacePostTags(database, postId, input.tags);
  return getPostById(postId);
}

export async function updatePost(id: number, input: { title: string; body: string; coverImageUrl: string | null; category: string; tags: string[] }) {
  const database = requireDb(await getDb());
  await database.update(posts).set({ title: input.title, body: input.body, coverImageUrl: input.coverImageUrl, category: input.category }).where(eq(posts.id, id));
  await replacePostTags(database, id, input.tags);
  return getPostById(id);
}

export async function setPostStatus(id: number, status: "published" | "unpublished") {
  const database = requireDb(await getDb());
  await database.update(posts).set({ status, publishedAt: status === "published" ? new Date() : null }).where(eq(posts.id, id));
  return getPostById(id);
}

export async function deletePost(id: number) {
  const database = requireDb(await getDb());
  await database.delete(posts).where(eq(posts.id, id));
}

export async function listPostsByAuthor(authorId: number) {
  const database = requireDb(await getDb());
  const rows = await database.select().from(posts).where(eq(posts.authorId, authorId)).orderBy(desc(posts.updatedAt));
  const tagsByPost = await tagsForPostIds(database, rows.map((post) => post.id));
  return rows.map((post) => ({ ...post, tags: tagsByPost[post.id] ?? [], excerpt: makeExcerpt(post.body) }));
}

export async function submitWriterApplication(userId: number, motivation: string) {
  const database = requireDb(await getDb());
  await database.insert(writerApplications).values({ userId, motivation, status: "pending", reviewedAt: null }).onDuplicateKeyUpdate({ set: { motivation, status: "pending", reviewedAt: null } });
  return getWriterApplication(userId);
}

export async function getWriterApplication(userId: number) {
  const database = requireDb(await getDb());
  const rows = await database.select().from(writerApplications).where(eq(writerApplications.userId, userId)).limit(1);
  return rows[0];
}

export async function listWriterApplications() {
  const database = requireDb(await getDb());
  const rows = await database.select().from(writerApplications).innerJoin(users, eq(writerApplications.userId, users.id)).orderBy(desc(writerApplications.createdAt));
  return rows.map(({ writerApplications: application, users: user }) => ({ ...application, userName: user.name, userEmail: user.email, userRole: user.role }));
}

export async function reviewWriterApplication(id: number, status: "approved" | "rejected") {
  const database = requireDb(await getDb());
  const [application] = await database.select().from(writerApplications).where(eq(writerApplications.id, id)).limit(1);
  if (!application) return undefined;
  await database.update(writerApplications).set({ status, reviewedAt: new Date() }).where(eq(writerApplications.id, id));
  if (status === "approved") await database.update(users).set({ role: "writer" }).where(eq(users.id, application.userId));
  return getWriterApplication(application.userId);
}

export async function createComment(input: { authorId: number; postId: number; body: string }) {
  const database = requireDb(await getDb());
  const result = await database.insert(comments).values(input);
  const id = Number(result[0].insertId);
  const rows = await database.select().from(comments).innerJoin(users, eq(comments.authorId, users.id)).where(eq(comments.id, id)).limit(1);
  const row = rows[0];
  return row ? { ...row.comments, authorName: row.users.name } : undefined;
}

export async function listVisibleComments(postId: number) {
  const database = requireDb(await getDb());
  const rows = await database.select().from(comments).innerJoin(users, eq(comments.authorId, users.id)).where(and(eq(comments.postId, postId), eq(comments.status, "visible"))).orderBy(desc(comments.createdAt));
  return rows.map(({ comments: comment, users: user }) => ({ ...comment, authorName: user.name }));
}

export async function hideComment(id: number) {
  const database = requireDb(await getDb());
  await database.update(comments).set({ status: "hidden" }).where(eq(comments.id, id));
  return { success: true } as const;
}

export async function listCommentsForAdmin() {
  const database = requireDb(await getDb());
  const rows = await database
    .select()
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .innerJoin(posts, eq(comments.postId, posts.id))
    .orderBy(desc(comments.createdAt));
  return rows.map(({ comments: comment, users: author, posts: post }) => ({ ...comment, authorName: author.name, postTitle: post.title, postSlug: post.slug }));
}

export async function setVote(input: { postId: number; userId: number; value: 1 | -1 }) {
  const database = requireDb(await getDb());
  await database.insert(postVotes).values(input).onDuplicateKeyUpdate({ set: { value: input.value } });
}

export async function getVoteSummary(postId: number) {
  const database = requireDb(await getDb());
  const rows = await database.select({ score: sql<number>`coalesce(sum(${postVotes.value}), 0)`, total: sql<number>`count(*)` }).from(postVotes).where(eq(postVotes.postId, postId));
  return { score: Number(rows[0]?.score ?? 0), total: Number(rows[0]?.total ?? 0) };
}

export async function listUsersForAdmin() {
  const database = requireDb(await getDb());
  return database.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function setUserRole(userId: number, role: "user" | "writer" | "admin") {
  const database = requireDb(await getDb());
  await database.update(users).set({ role }).where(eq(users.id, userId));
  return { success: true } as const;
}

export async function listPostsForAdmin() {
  const database = requireDb(await getDb());
  const joined = await database.select().from(posts).innerJoin(users, eq(posts.authorId, users.id)).orderBy(desc(posts.updatedAt));
  const rows = joined.map(({ posts: post, users: author }) => ({ ...post, authorName: author.name }));
  const tagsByPost = await tagsForPostIds(database, rows.map((post) => post.id));
  return rows.map((post) => ({ ...post, tags: tagsByPost[post.id] ?? [] }));
}
