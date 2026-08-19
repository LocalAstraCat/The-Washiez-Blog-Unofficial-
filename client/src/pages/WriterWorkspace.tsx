import { useAuth } from "@/_core/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AUTOSAVE_DELAY_MS, canSaveDraftToServer, draftStorageKey, DraftForm, hasLocalDraftContent, readLocalDraft, removeLocalDraft, writeLocalDraft } from "@/lib/draftRecovery";
import { createDraft, deleteDraft, fetchMyApplication, fetchMyPosts, PostInput, publishDraft, submitWriterApplication, updateDraft, useSupabaseQuery } from "@/lib/supabase";
import { CheckCircle2, Eye, FilePlus2, FileText, LogIn, PencilLine, Send, ShieldAlert, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

const blankForm: DraftForm = { title: "", body: "", coverImageUrl: "", category: "History", tags: "" };
const markdownReference = [
  { label: "Big title", code: "# Title" }, { label: "Section", code: "## Section" }, { label: "Bold", code: "**important**" }, { label: "Italic", code: "*note*" },
  { label: "Bullet list", code: "- One item" }, { label: "Numbered list", code: "1. First item" }, { label: "Link", code: "[Name](https://example.com)" }, { label: "Quote", code: "> Quote" },
];
function WorkspaceMessage({ title, copy, action, onAction, icon }: { title: string; copy: string; action?: string; onAction?: () => void; icon?: React.ReactNode }) { return <section className="workspace-message">{icon && <div className="workspace-message__icon">{icon}</div>}<h1>{title}</h1><p>{copy}</p>{action && onAction && <Button onClick={onAction}>{action}</Button>}</section>; }
function ApplicationGate() { const { isAuthenticated, loading } = useAuth(); const [, setLocation] = useLocation(); const [motivation, setMotivation] = useState(""); const [isSubmitting, setIsSubmitting] = useState(false); const [submitError, setSubmitError] = useState<string>(); const application = useSupabaseQuery(fetchMyApplication, []); const submit = async () => { setIsSubmitting(true); setSubmitError(undefined); try { await submitWriterApplication(motivation.trim()); await application.refetch(); } catch (error) { setSubmitError(error instanceof Error ? error.message : "Your application could not be sent."); } finally { setIsSubmitting(false); } }; if (loading) return <WorkspaceMessage title="Checking your account" copy="Loading your account…" />; if (!isAuthenticated) return <WorkspaceMessage title="Writers only" copy="Sign in first, then come back here to apply to write for the site." action="Go to posts" onAction={() => setLocation("/")} icon={<LogIn size={22} />} />; if (application.isLoading) return <WorkspaceMessage title="Checking your application" copy="Loading your writer status…" />; if (application.error) return <WorkspaceMessage title="We could not check your access" copy="Please try again before sending an application." action="Try again" onAction={() => void application.refetch()} icon={<ShieldAlert size={22} />} />; if (application.data?.status === "pending") return <WorkspaceMessage title="Your application is in review" copy="The site owner will check it before giving you writer access." icon={<FileText size={22} />} />; const revising = application.data?.status === "rejected"; return <section className="application-card"><span className="section-kicker"><PencilLine size={15} /> Writer access</span><h1>{revising ? "Send an updated application" : "Apply to write"}</h1><p>{revising ? "Your last application was not approved. Tell us more about what you want to write and how you will check your sources." : "Tell us what Washiez topics you want to cover and how you will keep your posts fair and well sourced."}</p><Textarea value={motivation} onChange={(event) => setMotivation(event.target.value)} placeholder="Write at least 50 characters…" /><div className="application-card__footer"><span>{motivation.trim().length}/50 minimum characters</span><Button disabled={motivation.trim().length < 50 || isSubmitting} onClick={() => void submit()}>{isSubmitting ? "Sending…" : revising ? "Send again" : "Send application"}<Send size={15} /></Button></div>{submitError && <p className="form-error">{submitError}</p>}</section>; }
function WriterDesk() {
  const { user } = useAuth();
  const drafts = useSupabaseQuery(fetchMyPosts, []);
  const manageableDrafts = useMemo(() => drafts.data?.filter((draft) => draft.status !== "published"), [drafts.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState<DraftForm>(blankForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [autosaveMessage, setAutosaveMessage] = useState("Saved on this device");
  const [formError, setFormError] = useState<string>();
  const [activeStorageKey, setActiveStorageKey] = useState<string | null>(null);
  const creatingDraft = useRef(false);
  const lastServerSignature = useRef<string | null>(null);
  const selected = useMemo(() => manageableDrafts?.find((draft) => draft.id === selectedId), [manageableDrafts, selectedId]);
  const storageKey = user ? draftStorageKey(user.id, selectedId) : null;
  const selectedForm = useMemo<DraftForm>(() => selected ? { title: selected.title, body: selected.body, coverImageUrl: selected.coverImageUrl ?? "", category: selected.category, tags: selected.tags.join(", ") } : blankForm, [selected]);
  const payload = useMemo<PostInput>(() => ({ ...form, coverImageUrl: form.coverImageUrl.trim() || null, tags: form.tags.split(",").map((value) => value.trim()).filter(Boolean) }), [form]);
  const valid = canSaveDraftToServer(form);
  const payloadSignature = JSON.stringify(payload);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const recovered = readLocalDraft(window.localStorage, storageKey);
    setForm(recovered?.form ?? selectedForm);
    setActiveStorageKey(storageKey);
    setAutosaveMessage(recovered ? "Recovered saved changes" : selected ? "Saved" : "Saved on this device");
    lastServerSignature.current = selected ? `${selected.id}:${JSON.stringify({ title: selected.title, body: selected.body, coverImageUrl: selected.coverImageUrl, category: selected.category, tags: selected.tags })}` : null;
  }, [selected, selectedForm, storageKey]);

  useEffect(() => {
    if (!storageKey || activeStorageKey !== storageKey || typeof window === "undefined") return;
    if (hasLocalDraftContent(form)) writeLocalDraft(window.localStorage, storageKey, form);
    else removeLocalDraft(window.localStorage, storageKey);
  }, [activeStorageKey, form, storageKey]);

  useEffect(() => {
    if (!storageKey || activeStorageKey !== storageKey || !valid || isSaving || creatingDraft.current) return;
    const serverKey = `${selected?.id ?? "new"}:${payloadSignature}`;
    if (lastServerSignature.current === serverKey) return;
    setAutosaveMessage("Saving…");
    const timer = window.setTimeout(() => {
      void (async () => {
        setIsAutosaving(true);
        try {
          if (selected?.id) {
            await updateDraft(selected.id, payload);
            lastServerSignature.current = `${selected.id}:${payloadSignature}`;
            setAutosaveMessage("Saved");
          } else {
            creatingDraft.current = true;
            const id = await createDraft(payload);
            lastServerSignature.current = `${id}:${payloadSignature}`;
            if (typeof window !== "undefined") removeLocalDraft(window.localStorage, storageKey);
            setSelectedId(id);
            await drafts.refetch();
            setAutosaveMessage("Saved");
          }
        } catch (error) {
          setFormError(error instanceof Error ? error.message : "Changes are saved on this device, but could not be saved online.");
          setAutosaveMessage("Saved on this device");
        } finally {
          creatingDraft.current = false;
          setIsAutosaving(false);
        }
      })();
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeStorageKey, drafts.refetch, isSaving, payload, payloadSignature, selected?.id, storageKey, valid]);

  const clearCurrentLocalDraft = () => { if (storageKey && typeof window !== "undefined") removeLocalDraft(window.localStorage, storageKey); };
  const save = async () => { if (!valid) return; setIsSaving(true); setFormError(undefined); try { const id = selected ? selected.id : await createDraft(payload); if (selected) await updateDraft(id, payload); lastServerSignature.current = `${id}:${payloadSignature}`; clearCurrentLocalDraft(); await drafts.refetch(); setSelectedId(id); setAutosaveMessage("Saved"); } catch (error) { setFormError(error instanceof Error ? error.message : "Your draft could not be saved."); } finally { setIsSaving(false); } };
  const publish = async () => { if (!selected || !valid) return; setIsSaving(true); setFormError(undefined); try { await updateDraft(selected.id, payload); await publishDraft(selected.id); clearCurrentLocalDraft(); await drafts.refetch(); setSelectedId(null); setAutosaveMessage("Saved"); } catch (error) { setFormError(error instanceof Error ? error.message : "Your post could not be published."); } finally { setIsSaving(false); } };
  const remove = async () => { if (!selected || !window.confirm("Delete this unpublished draft?")) return; setIsSaving(true); try { await deleteDraft(selected.id); clearCurrentLocalDraft(); setSelectedId(null); setForm(blankForm); await drafts.refetch(); } catch (error) { setFormError(error instanceof Error ? error.message : "Your draft could not be deleted."); } finally { setIsSaving(false); } };
  const updateForm = (changes: Partial<DraftForm>) => { setForm((current) => ({ ...current, ...changes })); setFormError(undefined); };

  return <div className="desk-layout"><aside className="desk-sidebar"><div className="desk-sidebar__head"><div><span className="section-kicker"><FileText size={14} /> My drafts</span><h2>Drafts</h2></div><Button size="icon" variant="outline" aria-label="Start a new post" onClick={() => setSelectedId(null)}><FilePlus2 size={16} /></Button></div><div className="draft-list">{drafts.isLoading && <p className="muted-copy">Loading drafts…</p>}{drafts.error && <div className="query-error"><span>Your drafts could not load.</span><Button size="sm" variant="outline" onClick={() => void drafts.refetch()}>Try again</Button></div>}{!drafts.isLoading && !drafts.error && !manageableDrafts?.length && <p className="muted-copy">No drafts yet. Start a new post.</p>}{manageableDrafts?.map((draft) => <button className={`draft-item ${selectedId === draft.id ? "active" : ""}`} key={draft.id} onClick={() => setSelectedId(draft.id)}><span className={`status-dot status-dot--${draft.status}`} /><span><strong>{draft.title}</strong><small>{draft.status} · {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span></button>)}</div><div className="desk-note"><CheckCircle2 size={15} /><p>Use sources and say when something is uncertain.</p></div></aside><section className="editor-panel"><header className="editor-panel__header"><div><span className="section-kicker"><PencilLine size={14} /> {selected ? "Editing draft" : "New draft"}</span><h1>{selected?.title || "Start a new post"}</h1></div><div className="editor-actions"><span className="autosave-status" aria-live="polite">{isAutosaving ? "Saving…" : autosaveMessage}</span><Button variant="outline" size="sm" onClick={() => setPreview(!preview)}><Eye size={14} /> {preview ? "Edit" : "Preview"}</Button>{selected?.status === "draft" && <Button variant="outline" size="sm" disabled={isSaving} onClick={() => void remove()}><Trash2 size={14} /></Button>}<Button variant="outline" size="sm" disabled={!valid || isSaving} onClick={() => void save()}>{isSaving ? "Saving…" : "Save"}</Button>{selected && <Button size="sm" disabled={!valid || isSaving} onClick={() => void publish()}>{isSaving ? "Publishing…" : "Publish"}<Send size={14} /></Button>}</div></header>{preview ? <article className="editor-preview"><span>{form.category}</span><h1>{form.title || "Untitled post"}</h1>{form.tags && <div className="tag-row">{form.tags.split(",").map((item) => item.trim()).filter(Boolean).map((item) => <span className="tag" key={item}>{item}</span>)}</div>}<div className="article-prose"><Streamdown>{form.body || "Start writing to preview your post."}</Streamdown></div></article> : <div className="editor-form"><div className="field-row"><label>Title<Input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="Clear, factual post title" /></label></div><div className="field-grid"><label>Category<Input value={form.category} onChange={(event) => updateForm({ category: event.target.value })} placeholder="History, updates, drama…" /></label><label>Tags <small>Separate with commas</small><Input value={form.tags} onChange={(event) => updateForm({ tags: event.target.value })} placeholder="Timeline, community" /></label></div><label>Cover image link <small>Optional</small><Input type="url" value={form.coverImageUrl} onChange={(event) => updateForm({ coverImageUrl: event.target.value })} placeholder="https://…" /></label><label>Post <small>You can use Markdown</small><Textarea className="article-editor" value={form.body} onChange={(event) => updateForm({ body: event.target.value })} placeholder={"## What happened\n\nWrite clearly and add sources where you can."} /></label><details className="markdown-help"><summary>Markdown quick help</summary><p>Use these shortcuts in your post, then press Preview to check the result.</p><div className="markdown-help__grid">{markdownReference.map((item) => <div key={item.label}><span>{item.label}</span><code>{item.code}</code></div>)}</div></details>{formError && <p className="form-error">{formError}</p>}</div>}</section></div>;
}
export default function WriterWorkspace() { const { user, loading } = useAuth(); const approved = user?.role === "writer" || user?.role === "admin"; return <div className="site-frame"><SiteHeader /><main className="workspace-shell">{loading ? <WorkspaceMessage title="Checking your account" copy="Loading your account…" /> : approved ? <WriterDesk /> : <ApplicationGate />}</main></div>; }
