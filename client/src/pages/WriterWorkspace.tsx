import { useAuth } from "@/_core/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChroniclePost, createDraft, deleteDraft, fetchMyApplication, fetchMyPosts, PostInput, publishDraft, submitWriterApplication, updateDraft, useSupabaseQuery } from "@/lib/supabase";
import { CheckCircle2, Eye, FilePlus2, FileText, LogIn, PencilLine, Send, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

const blankForm = { title: "", body: "", coverImageUrl: "", category: "History", tags: "" };

function WorkspaceMessage({ title, copy, action, onAction, icon }: { title: string; copy: string; action?: string; onAction?: () => void; icon?: React.ReactNode }) {
  return <section className="workspace-message">{icon && <div className="workspace-message__icon">{icon}</div>}<h1>{title}</h1><p>{copy}</p>{action && onAction && <Button onClick={onAction}>{action}</Button>}</section>;
}

function ApplicationGate() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [motivation, setMotivation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const application = useSupabaseQuery(fetchMyApplication, []);
  const submit = async () => {
    setIsSubmitting(true); setSubmitError(undefined);
    try { await submitWriterApplication(motivation.trim()); await application.refetch(); }
    catch (error) { setSubmitError(error instanceof Error ? error.message : "Application could not be sent."); }
    finally { setIsSubmitting(false); }
  };
  if (loading) return <WorkspaceMessage title="Checking your access" copy="Loading your Chronicle account…" />;
  if (!isAuthenticated) return <WorkspaceMessage title="Writing tools are for approved contributors" copy="Sign in with your Chronicle account from the archive, then return here to apply for writer access or manage an approved workspace." action="Return to archive" onAction={() => setLocation("/")} icon={<LogIn size={22} />} />;
  if (application.isLoading) return <WorkspaceMessage title="Checking your application" copy="Loading your contributor status…" />;
  if (application.error) return <WorkspaceMessage title="Contributor status unavailable" copy="Your account could not be checked right now. Retry the status check before submitting an application." action="Retry access check" onAction={() => void application.refetch()} icon={<ShieldAlert size={22} />} />;
  if (application.data?.status === "pending") return <WorkspaceMessage title="Application under review" copy="Your writer application is awaiting an owner decision. You will gain access to drafting tools once it has been approved." icon={<FileText size={22} />} />;
  const revising = application.data?.status === "rejected";
  return <section className="application-card"><span className="section-kicker"><PencilLine size={15} /> Contributor access</span><h1>{revising ? "Send a revised application." : "Apply to write for the Chronicle."}</h1><p>{revising ? "Your earlier application was not approved. You may submit an improved application that more clearly explains your intended topics, sourcing practices, and commitment to fair presentation." : "Writer access is reviewed by the owner. Explain the Washiez topics you would cover, how you would approach sourcing, and how you would keep contested subjects fair."}</p><Textarea value={motivation} onChange={(event) => setMotivation(event.target.value)} placeholder="Write at least 50 characters about your intended contributions…" /><div className="application-card__footer"><span>{motivation.trim().length}/50 minimum characters</span><Button disabled={motivation.trim().length < 50 || isSubmitting} onClick={() => void submit()}>{isSubmitting ? "Submitting…" : revising ? "Resubmit application" : "Submit writer application"}<Send size={15} /></Button></div>{submitError && <p className="form-error">{submitError}</p>}</section>;
}

function WriterDesk() {
  const drafts = useSupabaseQuery(fetchMyPosts, []);
  const manageableDrafts = useMemo(() => drafts.data?.filter((draft) => draft.status !== "published"), [drafts.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const selected = useMemo(() => manageableDrafts?.find((draft) => draft.id === selectedId), [manageableDrafts, selectedId]);
  useEffect(() => { if (selected) setForm({ title: selected.title, body: selected.body, coverImageUrl: selected.coverImageUrl ?? "", category: selected.category, tags: selected.tags.join(", ") }); else setForm(blankForm); }, [selected]);
  const payload = (): PostInput => ({ ...form, coverImageUrl: form.coverImageUrl.trim() || null, tags: form.tags.split(",").map((value) => value.trim()).filter(Boolean) });
  const valid = form.title.trim().length >= 4 && form.body.trim().length >= 20 && form.category.trim().length >= 2;
  const save = async () => {
    if (!valid) return; setIsSaving(true); setFormError(undefined);
    try { const id = selected ? selected.id : await createDraft(payload()); if (selected) await updateDraft(id, payload()); await drafts.refetch(); setSelectedId(id); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Draft could not be saved."); }
    finally { setIsSaving(false); }
  };
  const publish = async () => { if (!selected || !valid) return; setIsSaving(true); setFormError(undefined); try { await updateDraft(selected.id, payload()); await publishDraft(selected.id); await drafts.refetch(); setSelectedId(null); } catch (error) { setFormError(error instanceof Error ? error.message : "Article could not be published."); } finally { setIsSaving(false); } };
  const remove = async () => { if (!selected || !window.confirm("Delete this unpublished draft?")) return; setIsSaving(true); try { await deleteDraft(selected.id); setSelectedId(null); setForm(blankForm); await drafts.refetch(); } catch (error) { setFormError(error instanceof Error ? error.message : "Draft could not be deleted."); } finally { setIsSaving(false); } };
  return <div className="desk-layout"><aside className="desk-sidebar"><div className="desk-sidebar__head"><div><span className="section-kicker"><FileText size={14} /> Your desk</span><h2>Drafts</h2></div><Button size="icon" variant="outline" aria-label="Start a new draft" onClick={() => setSelectedId(null)}><FilePlus2 size={16} /></Button></div><div className="draft-list">{drafts.isLoading && <p className="muted-copy">Loading drafts…</p>}{drafts.error && <div className="query-error"><span>Your drafts could not be loaded.</span><Button size="sm" variant="outline" onClick={() => void drafts.refetch()}>Retry</Button></div>}{!drafts.isLoading && !drafts.error && !manageableDrafts?.length && <p className="muted-copy">No editable drafts yet. Start a new entry.</p>}{manageableDrafts?.map((draft) => <button className={`draft-item ${selectedId === draft.id ? "active" : ""}`} key={draft.id} onClick={() => setSelectedId(draft.id)}><span className={`status-dot status-dot--${draft.status}`} /><span><strong>{draft.title}</strong><small>{draft.status} · {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span></button>)}</div><div className="desk-note"><CheckCircle2 size={15} /><p>Use clear citations and mark uncertain claims as such before publishing.</p></div></aside><section className="editor-panel"><header className="editor-panel__header"><div><span className="section-kicker"><PencilLine size={14} /> {selected ? "Editing draft" : "New draft"}</span><h1>{selected?.title || "Start a considered entry"}</h1></div><div className="editor-actions"><Button variant="outline" size="sm" onClick={() => setPreview(!preview)}><Eye size={14} /> {preview ? "Edit" : "Preview"}</Button>{selected?.status === "draft" && <Button variant="outline" size="sm" disabled={isSaving} onClick={() => void remove()}><Trash2 size={14} /></Button>}<Button variant="outline" size="sm" disabled={!valid || isSaving} onClick={() => void save()}>{isSaving ? "Saving…" : "Save draft"}</Button>{selected && <Button size="sm" disabled={!valid || isSaving} onClick={() => void publish()}>{isSaving ? "Publishing…" : "Publish"}<Send size={14} /></Button>}</div></header>{preview ? <article className="editor-preview"><span>{form.category}</span><h1>{form.title || "Untitled article"}</h1>{form.tags && <div className="tag-row">{form.tags.split(",").map((item) => item.trim()).filter(Boolean).map((item) => <span className="tag" key={item}>{item}</span>)}</div>}<div className="article-prose"><Streamdown>{form.body || "Begin writing to preview your article."}</Streamdown></div></article> : <div className="editor-form"><div className="field-row"><label>Title<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Clear, factual article title" /></label></div><div className="field-grid"><label>Category<Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="History, Updates, Drama…" /></label><label>Tags <small>Comma-separated</small><Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="Timeline, Community" /></label></div><label>Cover image URL <small>Optional image link</small><Input type="url" value={form.coverImageUrl} onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })} placeholder="https://…" /></label><label>Article body <small>Markdown formatting supported</small><Textarea className="article-editor" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder={"## Context\n\nWrite in a neutral, source-aware voice…\n\n> Quote primary material where relevant."} /></label>{formError && <p className="form-error">{formError}</p>}</div>}</section></div>;
}

export default function WriterWorkspace() {
  const { user, loading } = useAuth();
  const approved = user?.role === "writer" || user?.role === "admin";
  return <div className="site-frame"><SiteHeader /><main className="workspace-shell">{loading ? <WorkspaceMessage title="Checking your access" copy="Loading your Chronicle account…" /> : approved ? <WriterDesk /> : <ApplicationGate />}</main></div>;
}
