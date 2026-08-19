import { ArrowUpRight, CalendarDays, Clock3, Pin } from "lucide-react";
import { Link } from "wouter";

type ArticleCardProps = {
  post: {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    tags: string[];
    authorName: string | null;
    publishedAt: Date | string | null;
    createdAt: Date | string;
    isPinned?: boolean;
  };
  feature?: boolean;
};

function formatDate(value: Date | string | null) {
  return new Date(value ?? Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ArticleCard({ post, feature = false }: ArticleCardProps) {
  return (
    <article className={`article-card ${feature ? "article-card--feature" : ""}`}>
      <div className="article-card__eyebrow">{post.isPinned && <span className="pinned-label"><Pin size={12} /> Pinned</span>}<span>{post.category}</span><span className="eyebrow-rule" /><time dateTime={String(post.publishedAt ?? post.createdAt)}><CalendarDays size={13} />{formatDate(post.publishedAt ?? post.createdAt)}</time></div>
      <h2><Link href={`/article/${post.slug}`}>{post.title}</Link></h2>
      <p className="article-card__excerpt">{post.excerpt}</p>
      <div className="article-card__footer">
        <div className="article-card__meta"><span>By {post.authorName || "Chronicle staff"}</span><span><Clock3 size={13} /> Article</span></div>
        <Link href={`/article/${post.slug}`} className="read-link">Read <ArrowUpRight size={15} /></Link>
      </div>
      {post.tags.length > 0 && <div className="tag-row">{post.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>}
    </article>
  );
}
