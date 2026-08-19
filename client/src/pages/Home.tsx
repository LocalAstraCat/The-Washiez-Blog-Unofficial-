import { ArticleCard } from "@/components/ArticleCard";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPublishedPosts, useSupabaseQuery } from "@/lib/supabase";
import { BookOpen, ChevronRight, FileText, Search, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link } from "wouter";

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [tag, setTag] = useState<string | undefined>();
  const filters = useMemo(() => ({ search: search || undefined, category, tag }), [search, category, tag]);
  const archive = useSupabaseQuery(() => fetchPublishedPosts(filters), [filters]);
  const posts = archive.data;
  const categories = useMemo(() => Array.from(new Set(posts?.map((post) => post.category) ?? [])).sort(), [posts]);
  const tags = useMemo(() => Array.from(new Set(posts?.flatMap((post) => post.tags) ?? [])).sort().map((name) => ({ name, slug: name })), [posts]);
  const clearFilters = () => { setSearch(""); setCategory(undefined); setTag(undefined); };

  return <div className="site-frame">
    <SiteHeader />
    <main>
      <section className="hero">
        <div className="hero__content"><span className="section-kicker"><BookOpen size={15} /> Washiez community wiki</span><h1>Washiez stories, <em>all in one place.</em></h1><p>Read about game updates, history, big community moments, and more. Anyone can read the posts.</p><div className="hero__actions"><a href="#archive" className="button-link">Browse posts <ChevronRight size={16} /></a><Link href="/about" className="quiet-link">How we write</Link></div></div>
        <aside className="hero__note"><span>About this site</span><p>You can read without an account. Sign in if you want to comment, vote, or apply to write.</p><div><ShieldCheck size={17} /> Writers are approved first</div></aside>
      </section>
      <section className="archive-section" id="archive">
        <header className="archive-header"><div><span className="section-kicker"><FileText size={15} /> Latest posts</span><h2>Posts</h2></div><p>{posts?.length ?? 0} {posts?.length === 1 ? "post" : "posts"}</p></header>
        <div className="archive-layout">
          <aside className="filter-panel"><div className="search-field"><Search size={17} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts" aria-label="Search posts" /></div><div className="filter-group"><span>Category</span><div className="filter-list"><button className={!category ? "active" : ""} onClick={() => setCategory(undefined)}>All posts</button>{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="filter-group"><span>Topics</span><div className="topic-list">{tags.map((item) => <button key={item.slug} className={tag === item.slug ? "active" : ""} onClick={() => setTag(tag === item.slug ? undefined : item.slug)}>{item.name}</button>)}</div></div>{archive.error && <p className="query-error">Filters are not working right now. Try again in a moment.</p>}{(search || category || tag) && <Button variant="ghost" className="reset-filter" onClick={clearFilters}>Clear filters</Button>}</aside>
          <div className="article-list">{archive.isLoading && <p className="muted-copy">Loading posts…</p>}{archive.error && <div className="query-error query-error--card"><strong>Posts could not load.</strong><span>Your search is still here. Please try again.</span><Button variant="outline" size="sm" onClick={() => void archive.refetch()}>Try again</Button></div>}{!archive.isLoading && !archive.error && !posts?.length && <div className="empty-state"><h3>No posts found.</h3><p>Try a different search or clear your filters. New posts will show here when a writer publishes them.</p><Button variant="outline" onClick={clearFilters}>Clear filters</Button></div>}{posts?.map((post, index) => <ArticleCard key={post.id} post={post} feature={index === 0} />)}</div>
        </div>
      </section>
    </main>
    <footer className="site-footer"><div><strong>The Washiez Chronicle</strong><span>Community wiki and blog</span></div><p>Read freely · Write with approval · Keep it fair</p></footer>
  </div>;
}
