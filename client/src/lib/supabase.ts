import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { withPinnedPostFirst } from "./pinning";
import { isValidUsername, nativeAccountEmail, normalizeUsername } from "./username";

export { isValidUsername } from "./username";

const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!projectUrl || !publishableKey) {
  throw new Error("Supabase browser configuration is missing.");
}

export const supabase = createClient(projectUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const nativeRedirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;

export async function signUpWithUsername({ username, password, email }: { username: string; password: string; email?: string }) {
  const canonicalUsername = normalizeUsername(username);
  if (!isValidUsername(canonicalUsername)) throw new Error("Choose a username with 3–24 letters, numbers, underscores, or hyphens.");
  if (password.length < 8) throw new Error("Choose a password with at least 8 characters.");
  const pendingEmail = email?.trim().toLowerCase() || undefined;
  const { data, error } = await supabase.auth.signUp({
    email: nativeAccountEmail(canonicalUsername), password,
    options: { data: { username: canonicalUsername, pending_email: pendingEmail }, emailRedirectTo: nativeRedirectUrl },
  });
  if (error) throw error;
  return { verificationPending: Boolean(pendingEmail) };
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized || !password) throw new Error("Enter your username or verified email and password.");
  const email = normalized.includes("@") ? normalized : nativeAccountEmail(normalized);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function requestOptionalEmailVerification(pendingEmail: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to verify your optional email address.");
  if (user.email?.toLowerCase() !== pendingEmail.toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email: pendingEmail }, { emailRedirectTo: nativeRedirectUrl });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.auth.resend({ type: "email_change", email: pendingEmail, options: { emailRedirectTo: nativeRedirectUrl } });
  if (error) throw error;
}

type ProfileJoin = { display_name: string | null } | { display_name: string | null }[] | null;

export type ChroniclePost = {
  id: string;
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  coverImageUrl: string | null;
  category: string;
  tags: string[];
  status: "draft" | "published" | "unpublished";
  authorId: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isPinned: boolean;
};

type PostRow = {
  id: string; slug: string; title: string; body: string; cover_image_url: string | null;
  category: string; tags: string[]; status: ChroniclePost["status"]; author_id: string;
  created_at: string; updated_at: string; published_at: string | null; profiles: ProfileJoin;
};

export function toChroniclePost(row: PostRow): ChroniclePost {
  const excerpt = row.body.replace(/[#>*_`\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 190);
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id, slug: row.slug, title: row.title, body: row.body, excerpt: excerpt ? `${excerpt}${row.body.length > excerpt.length ? "…" : ""}` : "",
    coverImageUrl: row.cover_image_url, category: row.category, tags: row.tags ?? [], status: row.status,
    authorId: row.author_id, authorName: profile?.display_name ?? null, createdAt: row.created_at,
    updatedAt: row.updated_at, publishedAt: row.published_at, isPinned: false,
  };
}

export function useSupabaseQuery<T>(load: () => Promise<T>, dependencies: readonly unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);
  const refresh = useCallback(async () => {
    setIsLoading(true); setError(undefined);
    try { setData(await load()); } catch (cause) { setError(cause instanceof Error ? cause : new Error("Unable to load this content.")); }
    finally { setIsLoading(false); }
  // The caller owns the stable dependency array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, error, isLoading, refetch: refresh };
}

export async function fetchPublishedPosts(filters: { search?: string; category?: string; tag?: string }) {
  let query = supabase
    .from("posts")
    .select("id,slug,title,body,cover_image_url,category,tags,status,author_id,created_at,updated_at,published_at,profiles!posts_author_id_fkey(display_name)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  if (filters.search) query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`);
  const [pinnedPostId, { data, error }] = await Promise.all([fetchPinnedPostId(), query]);
  if (error) throw error;
  return withPinnedPostFirst(((data ?? []) as PostRow[]).map(toChroniclePost), pinnedPostId);
}

export async function fetchPublishedPost(slug: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,body,cover_image_url,category,tags,status,author_id,created_at,updated_at,published_at,profiles!posts_author_id_fkey(display_name)")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data ? toChroniclePost(data as PostRow) : null;
}

export async function fetchPinnedPostId() {
  const { data, error } = await supabase.from("site_settings").select("pinned_post_id").eq("id", 1).maybeSingle();
  if (error) throw error;
  return (data?.pinned_post_id as string | null | undefined) ?? null;
}

export type ChronicleComment = { id: string; body: string; createdAt: string; authorName: string | null };

export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("id,body,created_at,profiles!comments_author_id_fkey(display_name)")
    .eq("post_id", postId).eq("status", "visible").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; body: string; created_at: string; profiles: ProfileJoin }) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { id: row.id, body: row.body, createdAt: row.created_at, authorName: profile?.display_name ?? null };
  });
}

export async function createComment(postId: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to post a reader note.");
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body });
  if (error) throw error;
}

export async function fetchVoteSummary(postId: string) {
  const { data, error } = await supabase.from("post_votes").select("value").eq("post_id", postId);
  if (error) throw error;
  const votes = data ?? [];
  return { score: votes.reduce((sum, vote) => sum + vote.value, 0), total: votes.length };
}

export async function castVote(postId: string, value: 1 | -1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to vote.");
  const { error } = await supabase.from("post_votes").upsert({ post_id: postId, user_id: user.id, value });
  if (error) throw error;
}

export type WriterApplication = { id: string; status: "pending" | "approved" | "rejected"; motivation: string; createdAt: string };
export type PostInput = { title: string; body: string; coverImageUrl: string | null; category: string; tags: string[] };

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue.");
  return user.id;
}

export async function fetchMyApplication() {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("writer_applications").select("id,status,motivation,created_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, status: data.status as WriterApplication["status"], motivation: data.motivation, createdAt: data.created_at } : null;
}

export async function submitWriterApplication(motivation: string) {
  const userId = await currentUserId();
  const { error } = await supabase.from("writer_applications").upsert({ user_id: userId, motivation, status: "pending", reviewed_at: null }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function fetchMyPosts() {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,body,cover_image_url,category,tags,status,author_id,created_at,updated_at,published_at,profiles!posts_author_id_fkey(display_name)")
    .eq("author_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PostRow[]).map(toChroniclePost);
}

function slugify(title: string) {
  const core = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "chronicle-entry";
  return `${core}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createDraft(input: PostInput) {
  const authorId = await currentUserId();
  const { data, error } = await supabase.from("posts").insert({
    slug: slugify(input.title), title: input.title.trim(), body: input.body.trim(), cover_image_url: input.coverImageUrl,
    category: input.category.trim(), tags: input.tags, status: "draft", author_id: authorId,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateDraft(id: string, input: PostInput) {
  const { error } = await supabase.from("posts").update({ title: input.title.trim(), body: input.body.trim(), cover_image_url: input.coverImageUrl, category: input.category.trim(), tags: input.tags }).eq("id", id);
  if (error) throw error;
}

export async function publishDraft(id: string) {
  const { error } = await supabase.from("posts").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteDraft(id: string) {
  const { error } = await supabase.from("posts").delete().eq("id", id).neq("status", "published");
  if (error) throw error;
}

export type AdminApplication = WriterApplication & { userId: string; userName: string | null };
export type AdminProfile = { id: string; name: string | null; role: "user" | "writer" | "admin"; createdAt: string };
export type AdminComment = { id: string; body: string; status: "visible" | "hidden"; createdAt: string; authorName: string | null; postTitle: string | null };

export async function fetchAdminApplications() {
  const { data, error } = await supabase.from("writer_applications").select("id,user_id,status,motivation,created_at,profiles!writer_applications_user_id_fkey(display_name)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; user_id: string; status: AdminApplication["status"]; motivation: string; created_at: string; profiles: ProfileJoin }) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { id: row.id, userId: row.user_id, status: row.status, motivation: row.motivation, createdAt: row.created_at, userName: profile?.display_name ?? null };
  });
}

export async function reviewWriterApplication(id: string, userId: string, status: "approved" | "rejected") {
  const { error } = await supabase.from("writer_applications").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  if (status === "approved") {
    const { error: roleError } = await supabase.from("profiles").update({ role: "writer" }).eq("id", userId);
    if (roleError) throw roleError;
  }
}

export async function fetchAdminProfiles() {
  const { data, error } = await supabase.from("profiles").select("id,display_name,role,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.display_name, role: row.role as AdminProfile["role"], createdAt: row.created_at }));
}

export async function setProfileRole(id: string, role: AdminProfile["role"]) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function fetchAdminPosts() {
  const [pinnedPostId, { data, error }] = await Promise.all([
    fetchPinnedPostId(),
    supabase.from("posts").select("id,slug,title,body,cover_image_url,category,tags,status,author_id,created_at,updated_at,published_at,profiles!posts_author_id_fkey(display_name)").order("updated_at", { ascending: false }),
  ]);
  if (error) throw error;
  return withPinnedPostFirst(((data ?? []) as PostRow[]).map(toChroniclePost), pinnedPostId);
}

export async function setPinnedPost(id: string | null) {
  const { error } = await supabase.rpc("set_pinned_post", { target_post_id: id });
  if (error) throw error;
}

export async function moderatePost(id: string, action: "unpublish" | "delete") {
  const result = action === "delete" ? await supabase.from("posts").delete().eq("id", id) : await supabase.from("posts").update({ status: "unpublished" }).eq("id", id);
  if (result.error) throw result.error;
}

export async function fetchAdminComments() {
  const { data, error } = await supabase.from("comments").select("id,body,status,created_at,profiles!comments_author_id_fkey(display_name),posts!comments_post_id_fkey(title)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; body: string; status: AdminComment["status"]; created_at: string; profiles: ProfileJoin; posts: { title: string } | { title: string }[] | null }) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
    return { id: row.id, body: row.body, status: row.status, createdAt: row.created_at, authorName: profile?.display_name ?? null, postTitle: post?.title ?? null };
  });
}

export async function hideComment(id: string) {
  const { error } = await supabase.from("comments").update({ status: "hidden" }).eq("id", id);
  if (error) throw error;
}
