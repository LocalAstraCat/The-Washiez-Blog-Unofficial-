import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { castVote, createComment, fetchComments, fetchPublishedPost, fetchVoteSummary, useSupabaseQuery } from "@/lib/supabase";
import { ArrowBigDown, ArrowBigUp, ArrowLeft, CalendarDays, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { Link, useLocation, useRoute } from "wouter";

function readableDate(value: Date | string | null) {
  return new Date(value ?? Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function VoteBox({ postId }: { postId: string }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const summary = useSupabaseQuery(() => fetchVoteSummary(postId), [postId]);
  const [isVoting, setIsVoting] = useState(false);
  const cast = async (value: 1 | -1) => {
    if (!isAuthenticated) { setLocation("/"); return; }
    setIsVoting(true);
    try { await castVote(postId, value); await summary.refetch(); } finally { setIsVoting(false); }
  };
  return <div className="vote-box" aria-label="Article vote"><button disabled={isVoting} onClick={() => void cast(1)} aria-label="Upvote article"><ArrowBigUp size={22} /></button><strong>{summary.data?.score ?? 0}</strong><button disabled={isVoting} onClick={() => void cast(-1)} aria-label="Downvote article"><ArrowBigDown size={22} /></button><span>{summary.data?.total ?? 0} votes</span></div>;
}

function Discussion({ postId }: { postId: string }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [body, setBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string>();
  const comments = useSupabaseQuery(() => fetchComments(postId), [postId]);
  const submit = async () => {
    setIsPosting(true); setPostError(undefined);
    try { await createComment(postId, body.trim()); setBody(""); await comments.refetch(); }
    catch (error) { setPostError(error instanceof Error ? error.message : "Your note could not be posted."); }
    finally { setIsPosting(false); }
  };
  return <section className="discussion" id="discussion"><div className="section-kicker"><MessageSquare size={15} /> Discussion</div><h2>Reader notes</h2><p className="discussion__intro">Keep replies relevant, cite sources where possible, and distinguish documented information from personal interpretation.</p>{isAuthenticated ? <div className="comment-form"><Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Add a thoughtful note as ${user?.name ?? "a reader"}…`} /><Button disabled={body.trim().length < 2 || isPosting} onClick={() => void submit()}><Send size={15} /> {isPosting ? "Posting…" : "Post note"}</Button>{postError && <p className="form-error">{postError}</p>}</div> : <div className="login-prompt"><p>Sign in from the archive to join the discussion or vote on this article.</p><Button variant="outline" onClick={() => setLocation("/")}>Return to archive</Button></div>}<div className="comment-list">{comments.isLoading && <p className="muted-copy">Loading discussion…</p>}{comments.error && <div className="query-error"><span>Reader notes could not be loaded.</span><Button size="sm" variant="outline" onClick={() => void comments.refetch()}>Retry</Button></div>}{!comments.isLoading && !comments.error && !comments.data?.length && <p className="muted-copy">No reader notes yet. Be the first to contribute a considered response.</p>}{comments.data?.map((comment) => <article className="comment" key={comment.id}><div className="comment__avatar">{(comment.authorName || "R").slice(0, 1).toUpperCase()}</div><div><header><strong>{comment.authorName || "Reader"}</strong><time>{readableDate(comment.createdAt)}</time></header><p>{comment.body}</p></div></article>)}</div></section>;
}

export default function ArticlePage() {
  const [, params] = useRoute("/article/:slug");
  const slug = params?.slug ?? "";
  const article = useSupabaseQuery(() => fetchPublishedPost(slug), [slug]);
  const post = article.data;
  if (article.isLoading) return <main className="reading-shell"><p className="muted-copy">Loading article…</p></main>;
  if (article.error || !post) return <main className="reading-shell empty-state"><h1>Article unavailable</h1><p>This article may have been removed, unpublished, or its link may be incomplete.</p><Link href="/" className="text-link">Return to the archive</Link></main>;
  return <main className="reading-shell"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to archive</Link><article className="article-view"><header className="article-view__header"><div className="article-view__topline"><span>{post.category}</span><span className="eyebrow-rule" /><time><CalendarDays size={14} />{readableDate(post.publishedAt ?? post.createdAt)}</time></div><h1>{post.title}</h1><div className="article-view__byline"><span>Written by <strong>{post.authorName || "Chronicle staff"}</strong></span><span className="byline-dot">•</span><span>Published reference</span></div>{post.tags.length > 0 && <div className="tag-row tag-row--article">{post.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>}</header>{post.coverImageUrl && <img className="article-cover" src={post.coverImageUrl} alt="Article cover" />}<div className="article-reading-grid"><aside><VoteBox postId={post.id} /></aside><div className="article-prose"><Streamdown>{post.body}</Streamdown></div></div></article><Discussion postId={post.id} /></main>;
}
