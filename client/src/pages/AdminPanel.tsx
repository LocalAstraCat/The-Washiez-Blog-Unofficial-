import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, FileWarning, MessageSquareWarning, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { useState } from "react";

type AdminTab = "applications" | "people" | "articles" | "comments";

function RetryNotice({ copy, onRetry }: { copy: string; onRetry: () => void }) {
  return <div className="query-error query-error--card"><strong>Information unavailable</strong><span>{copy}</span><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>;
}

function AccessNotice() {
  const { user } = useAuth();
  return <div className="admin-access"><ShieldCheck size={24} /><h1>Owner moderation only</h1><p>{user ? "Your account is signed in, but it does not have owner moderation access." : "Sign in with the owner account to access moderation tools."}</p></div>;
}

function AdminContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<AdminTab>("applications");
  const utils = trpc.useUtils();
  const applications = trpc.admin.applications.useQuery(undefined, { enabled: isAdmin });
  const people = trpc.admin.users.useQuery(undefined, { enabled: isAdmin });
  const articles = trpc.admin.posts.useQuery(undefined, { enabled: isAdmin });
  const comments = trpc.admin.comments.useQuery(undefined, { enabled: isAdmin });
  const reviewApplication = trpc.admin.reviewApplication.useMutation({ onSuccess: () => { utils.admin.applications.invalidate(); utils.admin.users.invalidate(); } });
  const changeRole = trpc.admin.setRole.useMutation({ onSuccess: () => utils.admin.users.invalidate() });
  const moderatePost = trpc.admin.moderatePost.useMutation({ onSuccess: () => { utils.admin.posts.invalidate(); utils.posts.list.invalidate(); } });
  const hideComment = trpc.admin.hideComment.useMutation({ onSuccess: () => { utils.admin.comments.invalidate(); } });

  if (!isAdmin) return <AccessNotice />;
  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "applications", label: "Applications", icon: <BadgeCheck size={15} /> },
    { id: "people", label: "Accounts", icon: <UsersRound size={15} /> },
    { id: "articles", label: "Articles", icon: <FileWarning size={15} /> },
    { id: "comments", label: "Comments", icon: <MessageSquareWarning size={15} /> },
  ];
  return <div className="admin-console"><header className="admin-console__head"><div><span className="section-kicker"><ShieldCheck size={14} /> Owner controls</span><h1>Editorial moderation</h1><p>Review contributors, manage access, and keep published material aligned with the Chronicle’s standards.</p></div></header><div className="admin-tabs" role="tablist">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.icon}{item.label}</button>)}</div>
    {tab === "applications" && <section className="admin-section"><div className="admin-section__heading"><h2>Writer applications</h2><span>{applications.data?.filter((item) => item.status === "pending").length ?? 0} pending</span></div><div className="moderation-list">{applications.isLoading && <p className="muted-copy">Loading applications…</p>}{applications.error && <RetryNotice copy="Writer applications could not be retrieved." onRetry={() => { void applications.refetch(); }} />}{!applications.isLoading && !applications.error && !applications.data?.length && <p className="muted-copy">No writer applications have been submitted yet.</p>}{applications.data?.map((application) => <article className="application-row" key={application.id}><div className="person-mark">{(application.userName || "A").slice(0, 1).toUpperCase()}</div><div className="application-row__body"><div className="row-title"><strong>{application.userName || "Unnamed account"}</strong><span className={`admin-status admin-status--${application.status}`}>{application.status}</span></div><small>{application.userEmail || "No email provided"} · {new Date(application.createdAt).toLocaleDateString()}</small><p>{application.motivation}</p></div>{application.status === "pending" && <div className="row-actions"><Button size="sm" variant="outline" disabled={reviewApplication.isPending} onClick={() => reviewApplication.mutate({ id: application.id, status: "rejected" })}>Decline</Button><Button size="sm" disabled={reviewApplication.isPending} onClick={() => reviewApplication.mutate({ id: application.id, status: "approved" })}>Approve writer</Button></div>}</article>)}</div></section>}
    {tab === "people" && <section className="admin-section"><div className="admin-section__heading"><h2>Account roles</h2><span>{people.data?.length ?? 0} accounts</span></div><div className="admin-table"><div className="admin-table__head"><span>Account</span><span>Role</span><span>Last sign-in</span></div>{people.isLoading && <p className="muted-copy">Loading accounts…</p>}{people.error && <RetryNotice copy="Account roles could not be retrieved." onRetry={() => { void people.refetch(); }} />}{people.data?.map((person) => <div className="admin-table__row" key={person.id}><div><strong>{person.name || "Unnamed account"}</strong><small>{person.email || "No email provided"}</small></div><select aria-label={`Change role for ${person.name || "account"}`} value={person.role} disabled={changeRole.isPending} onChange={(event) => changeRole.mutate({ userId: person.id, role: event.target.value as "user" | "writer" | "admin" })}><option value="user">Reader</option><option value="writer">Writer</option><option value="admin">Admin</option></select><span>{new Date(person.lastSignedIn).toLocaleDateString()}</span></div>)}</div></section>}
    {tab === "articles" && <section className="admin-section"><div className="admin-section__heading"><h2>Article moderation</h2><span>{articles.data?.length ?? 0} total</span></div><div className="admin-table admin-table--articles"><div className="admin-table__head"><span>Article</span><span>Status</span><span>Author</span><span>Controls</span></div>{articles.isLoading && <p className="muted-copy">Loading articles…</p>}{articles.error && <RetryNotice copy="Article moderation data could not be retrieved." onRetry={() => { void articles.refetch(); }} />}{articles.data?.map((article) => <div className="admin-table__row" key={article.id}><div><strong>{article.title}</strong><small>{article.category}{article.tags.length ? ` · ${article.tags.join(", ")}` : ""}</small></div><span className={`admin-status admin-status--${article.status}`}>{article.status}</span><span>{article.authorName || "Unknown"}</span><div className="row-actions">{article.status === "published" && <Button size="sm" variant="outline" disabled={moderatePost.isPending} onClick={() => moderatePost.mutate({ id: article.id, action: "unpublish" })}>Unpublish</Button>}<Button size="sm" variant="destructive" disabled={moderatePost.isPending} onClick={() => { if (window.confirm(`Permanently delete “${article.title}”?`)) moderatePost.mutate({ id: article.id, action: "delete" }); }}>Delete</Button></div></div>)}</div></section>}
    {tab === "comments" && <section className="admin-section"><div className="admin-section__heading"><h2>Reader notes</h2><span>{comments.data?.filter((comment) => comment.status === "visible").length ?? 0} visible</span></div><div className="moderation-list">{comments.isLoading && <p className="muted-copy">Loading comments…</p>}{comments.error && <RetryNotice copy="Reader notes could not be retrieved." onRetry={() => { void comments.refetch(); }} />}{!comments.isLoading && !comments.error && !comments.data?.length && <p className="muted-copy">There are no reader notes to moderate yet.</p>}{comments.data?.map((comment) => <article className="comment-row" key={comment.id}><div><div className="row-title"><strong>{comment.authorName || "Reader"}</strong><span className={`admin-status admin-status--${comment.status}`}>{comment.status}</span></div><small>On “{comment.postTitle}” · {new Date(comment.createdAt).toLocaleDateString()}</small><p>{comment.body}</p></div>{comment.status === "visible" && <Button size="sm" variant="outline" disabled={hideComment.isPending} onClick={() => hideComment.mutate({ id: comment.id })}>Hide note</Button>}</article>)}</div></section>}
  </div>;
}

export default function AdminPanel() {
  return <DashboardLayout><AdminContent /></DashboardLayout>;
}
