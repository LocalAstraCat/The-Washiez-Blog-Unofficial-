import { ArticleCard } from "@/components/ArticleCard";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronRight, FileText, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [tag, setTag] = useState<string | undefined>();
  const filters = useMemo(() => ({ search: search || undefined, category, tag }), [search, category, tag]);
  const { data: posts, isLoading, error: postsError, refetch: refetchPosts } = trpc.posts.list.useQuery(filters);
  const { data: categories, error: categoriesError } = trpc.posts.categories.useQuery();
  const { data: tags, error: tagsError } = trpc.posts.tags.useQuery();
  const clearFilters = () => { setSearch(""); setCategory(undefined); setTag(undefined); };

  return <div className="site-frame">
    <SiteHeader />
    <main>
      <section className="hero">
        <div className="hero__content"><span className="section-kicker"><BookOpen size={15} /> Community reference &amp; archive</span><h1>Stories, records, and context from <em>Washiez.</em></h1><p>A writer-reviewed publication for the game’s history, updates, community conversations, and significant moments. Reading is open to everyone.</p><div className="hero__actions"><a href="#archive" className="button-link">Explore the archive <ChevronRight size={16} /></a><a href="/about" className="quiet-link">Read our editorial policy</a></div></div>
        <aside className="hero__note"><span>Chronicle note</span><p>Articles are published through a controlled contributor process, with room for sourced discussion from signed-in readers.</p><div><ShieldCheck size={17} /> Writer review enabled</div></aside>
      </section>
      <section className="archive-section" id="archive">
        <header className="archive-header"><div><span className="section-kicker"><FileText size={15} /> Latest entries</span><h2>The archive</h2></div><p>{posts?.length ?? 0} published {posts?.length === 1 ? "entry" : "entries"}</p></header>
        <div className="archive-layout">
          <aside className="filter-panel"><div className="search-field"><Search size={17} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the archive" aria-label="Search articles" /></div><div className="filter-group"><span>Browse by category</span><div className="filter-list"><button className={!category ? "active" : ""} onClick={() => setCategory(undefined)}>All categories</button>{categories?.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="filter-group"><span>Topics</span><div className="topic-list">{tags?.map((item) => <button key={item.slug} className={tag === item.slug ? "active" : ""} onClick={() => setTag(tag === item.slug ? undefined : item.slug)}>{item.name}</button>)}</div></div>{(categoriesError || tagsError) && <p className="query-error">Some archive filters are temporarily unavailable. Refresh the page to retry.</p>}{(search || category || tag) && <Button variant="ghost" className="reset-filter" onClick={clearFilters}>Clear filters</Button>}</aside>
          <div className="article-list">{isLoading && <p className="muted-copy">Loading the archive…</p>}{postsError && <div className="query-error query-error--card"><strong>The archive could not be loaded.</strong><span>Please retry the request. Your filters have been kept in place.</span><Button variant="outline" size="sm" onClick={() => void refetchPosts()}>Retry archive</Button></div>}{!isLoading && !postsError && !posts?.length && <div className="empty-state"><h3>No published entries match this view.</h3><p>Try widening your search or clearing a filter. New articles will appear here once an approved writer publishes them.</p><Button variant="outline" onClick={clearFilters}>Reset archive view</Button></div>}{posts?.map((post, index) => <ArticleCard key={post.id} post={post} feature={index === 0} />)}</div>
        </div>
      </section>
    </main>
    <footer className="site-footer"><div><strong>The Washiez Chronicle</strong><span>Independent community archive</span></div><p>Public reading · Controlled publishing · Thoughtful discussion</p></footer>
  </div>;
}
