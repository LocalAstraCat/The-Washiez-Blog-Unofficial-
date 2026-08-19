import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowBigDown, ArrowBigUp, ArrowLeft, CalendarDays, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { Link, useRoute } from "wouter";

function readableDate(value: Date | string | null) {
  return new Date(value ?? Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function VoteBox({ postId }: { postId: number }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data } = trpc.community.votes.summary.useQuery({ postId });
  const setVote = trpc.community.votes.set.useMutation({ onSuccess: () => utils.community.votes.summary.invalidate({ postId }) });
  const castVote = (value: 1 | -1) => {
    if (!isAuthenticated) return startLogin();
    setVote.mutate({ postId, value });
  };
  return <div className="vote-box" aria-label="Article vote"><button onClick={() => castVote(1)} aria-label="Upvote article"><ArrowBigUp size={22} /></button><strong>{data?.score ?? 0}</strong><button onClick={() => castVote(-1)} aria-label="Downvote article"><ArrowBigDown size={22} /></button><span>{data?.total ?? 0} votes</span></div>;
}

function Discussion({ postId }: { postId: number }) {
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const { data: comments, isLoading } = trpc.community.comments.list.useQuery({ postId });
  const create = trpc.community.comments.create.useMutation({
    onSuccess: () => { setBody(""); utils.community.comments.list.invalidate({ postId }); },
  });
  return (
    <section className="discussion" id="discussion">
      <div className="section-kicker"><MessageSquare size={15} /> Discussion</div>
      <h2>Reader notes</h2>
      <p className="discussion__intro">Keep replies relevant, cite sources where possible, and distinguish documented information from personal interpretation.</p>
      {isAuthenticated ? (
        <div className="comment-form">
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Add a thoughtful note as ${user?.name ?? "a reader"}…`} />
          <Button disabled={body.trim().length < 2 || create.isPending} onClick={() => create.mutate({ postId, body })}><Send size={15} /> {create.isPending ? "Posting…" : "Post note"}</Button>
        </div>
      ) : (
        <div className="login-prompt"><p>Sign in to join the discussion or vote on this article.</p><Button variant="outline" onClick={() => startLogin()}>Sign in to comment</Button></div>
      )}
      <div className="comment-list">
        {isLoading && <p className="muted-copy">Loading discussion…</p>}
        {!isLoading && !comments?.length && <p className="muted-copy">No reader notes yet. Be the first to contribute a considered response.</p>}
        {comments?.map((comment) => <article className="comment" key={comment.id}><div className="comment__avatar">{(comment.authorName || "R").slice(0, 1).toUpperCase()}</div><div><header><strong>{comment.authorName || "Reader"}</strong><time>{readableDate(comment.createdAt)}</time></header><p>{comment.body}</p></div></article>)}
      </div>
    </section>
  );
}

export default function ArticlePage() {
  const [, params] = useRoute("/article/:slug");
  const slug = params?.slug ?? "";
  const { data: post, isLoading, error } = trpc.posts.bySlug.useQuery({ slug });

  if (isLoading) return <main className="reading-shell"><p className="muted-copy">Loading article…</p></main>;
  if (error || !post) return <main className="reading-shell empty-state"><h1>Article unavailable</h1><p>This article may have been removed, unpublished, or its link may be incomplete.</p><Link href="/" className="text-link">Return to the archive</Link></main>;

  return (
    <main className="reading-shell">
      <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to archive</Link>
      <article className="article-view">
        <header className="article-view__header">
          <div className="article-view__topline"><span>{post.category}</span><span className="eyebrow-rule" /><time><CalendarDays size={14} />{readableDate(post.publishedAt ?? post.createdAt)}</time></div>
          <h1>{post.title}</h1>
          <div className="article-view__byline"><span>Written by <strong>{post.authorName || "Chronicle staff"}</strong></span><span className="byline-dot">•</span><span>Published reference</span></div>
          {post.tags.length > 0 && <div className="tag-row tag-row--article">{post.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>}
        </header>
        {post.coverImageUrl && <img className="article-cover" src={post.coverImageUrl} alt="Article cover" />}
        <div className="article-reading-grid">
          <aside><VoteBox postId={post.id} /></aside>
          <div className="article-prose"><Streamdown>{post.body}</Streamdown></div>
        </div>
      </article>
      <Discussion postId={post.id} />
    </main>
  );
}
