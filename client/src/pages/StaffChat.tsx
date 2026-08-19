import { useAuth } from "@/_core/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatRoomId,
  ChronicleChatMessage,
  createChatMessage,
  fetchChatMessages,
  fetchChatOwnerId,
  setChatMessagePinned,
  subscribeToChatRoom,
  useSupabaseQuery,
} from "@/lib/supabase";
import { canAccessStaffChatRoom, canManageChatPins, messageMentionsViewer, normalizeChatSearch } from "@/lib/staffChat";
import { AtSign, Crown, Hash, LogIn, MessageSquareText, Pin, Search, Send, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

type RoomDefinition = { id: ChatRoomId; title: string; description: string; icon: typeof ShieldCheck; adminOnly?: boolean };

const rooms: RoomDefinition[] = [
  { id: "writers", title: "Writer room", description: "Writers and admins", icon: UsersRound },
  { id: "admins", title: "Admin room", description: "Admins only", icon: ShieldCheck, adminOnly: true },
];

function ChatAccessNotice({ title, copy, action, onAction, icon }: { title: string; copy: string; action?: string; onAction?: () => void; icon: React.ReactNode }) {
  return <main className="workspace-shell"><section className="workspace-message"><div className="workspace-message__icon">{icon}</div><h1>{title}</h1><p>{copy}</p>{action && onAction && <Button onClick={onAction}>{action}</Button>}</section></main>;
}

function roomLabel(roomId: ChatRoomId) { return rooms.find((room) => room.id === roomId)?.title ?? "Staff room"; }

function MessageCard({ message, isAdmin, viewer, ownerId, actionId, onTogglePinned }: {
  message: ChronicleChatMessage; isAdmin: boolean; viewer: { id: string; role: "user" | "writer" | "admin" }; ownerId: string | null; actionId: string | null; onTogglePinned: (message: ChronicleChatMessage) => void;
}) {
  const mentionsViewer = messageMentionsViewer(message, viewer, ownerId);
  return <article className={`staff-chat-message ${message.isPinned ? "staff-chat-message--pinned" : ""}`}>
    <div className="staff-chat-message__avatar" aria-hidden="true">{message.authorName?.slice(0, 1).toUpperCase() ?? "?"}</div>
    <div className="staff-chat-message__content">
      <header><div className="staff-chat-message__identity"><strong>{message.authorName ?? "Chronicle member"}</strong>{message.authorRole && <span>{message.authorRole === "writer" ? "writer" : message.authorRole}</span>}</div><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></header>
      <div className="staff-chat-message__meta">{message.isPinned && <span className="staff-chat-pin"><Pin size={11} /> Pinned</span>}{mentionsViewer && <span className="staff-chat-mention"><AtSign size={11} /> Mentions you</span>}</div>
      <div className="staff-chat-message__body article-prose"><Streamdown>{message.body}</Streamdown></div>
    </div>
    {isAdmin && <Button type="button" variant="outline" size="sm" className="staff-chat-pin-action" disabled={actionId === message.id} onClick={() => onTogglePinned(message)}><Pin size={13} /> {actionId === message.id ? "Saving…" : message.isPinned ? "Unpin" : "Pin"}</Button>}
  </article>;
}

function StaffChatDesk({ user }: { user: { id: string; name: string | null; role: "user" | "writer" | "admin" } }) {
  const isAdmin = canManageChatPins(user.role);
  const [roomId, setRoomId] = useState<ChatRoomId>("writers");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const messages = useSupabaseQuery(() => fetchChatMessages(roomId, activeSearch), [roomId, activeSearch]);
  const owner = useSupabaseQuery(fetchChatOwnerId, []);
  const currentRoom = rooms.find((room) => room.id === roomId) ?? rooms[0];
  const currentRoomIcon = currentRoom.icon;
  const PinnedIcon = currentRoomIcon;
  const visibleRooms = useMemo(() => rooms.filter((room) => canAccessStaffChatRoom(user.role, room.id)), [user.role]);

  useEffect(() => subscribeToChatRoom(roomId, () => { void messages.refetch(); }), [messages.refetch, roomId]);

  const submitSearch = (event: FormEvent) => { event.preventDefault(); setActiveSearch(normalizeChatSearch(searchInput)); };
  const clearSearch = () => { setSearchInput(""); setActiveSearch(""); };
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    setIsSending(true);
    try {
      await createChatMessage(roomId, draft);
      setDraft("");
      await messages.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Your message could not be sent.");
    } finally { setIsSending(false); }
  };
  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };
  const togglePinned = async (message: ChronicleChatMessage) => {
    setFormError(undefined);
    setActionId(message.id);
    try {
      await setChatMessagePinned(message.id, !message.isPinned);
      await messages.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "That pin could not be changed.");
    } finally { setActionId(null); }
  };
  const selectRoom = (nextRoomId: ChatRoomId) => { setRoomId(nextRoomId); setSearchInput(""); setActiveSearch(""); setFormError(undefined); };

  return <main className="staff-chat-shell"><header className="staff-chat-intro"><div><span className="section-kicker"><MessageSquareText size={14} /> Chronicle staff chat</span><h1>Stay in the loop.</h1><p>Private text-only rooms for the people who run and write for the Chronicle. Unpinned messages are automatically removed after three months.</p></div><aside><strong><Pin size={14} /> Admins can keep key messages</strong><span>Use <code>@admins</code>, <code>@authors</code>, or <code>@owner</code> to flag the right group.</span></aside></header><div className="staff-chat-layout"><aside className="staff-chat-rooms"><div className="staff-chat-rooms__head"><span className="section-kicker"><Hash size={14} /> Rooms</span><p>Only permitted rooms appear here.</p></div>{visibleRooms.map((room) => { const Icon = room.icon; return <button key={room.id} type="button" className={roomId === room.id ? "active" : ""} onClick={() => selectRoom(room.id)}><Icon size={16} /><span><strong>{room.title}</strong><small>{room.description}</small></span></button>; })}<div className="staff-chat-rooms__note"><Crown size={15} /><p><strong>@owner</strong> reaches the site owner. <strong>@authors</strong> reaches writers and admins.</p></div></aside><section className="staff-chat-panel"><header className="staff-chat-panel__header"><div><span className="section-kicker"><PinnedIcon size={14} /> {roomLabel(roomId)}</span><h2>{currentRoom.description}</h2></div><form className="staff-chat-search" onSubmit={submitSearch}><Search size={15} /><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search this room" aria-label="Search this room" />{activeSearch && <button type="button" onClick={clearSearch}>Clear</button>}</form></header>{messages.isLoading ? <div className="staff-chat-loading">Loading messages…</div> : messages.error ? <div className="query-error query-error--card"><span>Messages could not load.</span><Button size="sm" variant="outline" onClick={() => void messages.refetch()}>Try again</Button></div> : <div className="staff-chat-message-list">{activeSearch && <p className="staff-chat-search-result">Showing messages matching <strong>“{activeSearch}”</strong>.</p>}{messages.data?.length ? messages.data.map((message) => <MessageCard key={message.id} message={message} isAdmin={isAdmin} viewer={user} ownerId={owner.data ?? null} actionId={actionId} onTogglePinned={(target) => void togglePinned(target)} />) : <div className="staff-chat-empty"><MessageSquareText size={24} /><h3>{activeSearch ? "No messages matched that search" : "No messages yet"}</h3><p>{activeSearch ? "Try a shorter search, or clear it to see recent room messages." : "Start the room with a short note for your fellow staff members."}</p></div>}</div>}<form className="staff-chat-composer" onSubmit={sendMessage}><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder={`Message ${roomLabel(roomId).toLowerCase()}… Use @admins, @authors, or @owner.`} maxLength={4000} /><div><span>{draft.trim().length}/4000 · Enter sends, Shift + Enter adds a line.</span><Button type="submit" disabled={!draft.trim() || isSending}>{isSending ? "Sending…" : "Send"}<Send size={15} /></Button></div>{formError && <p className="form-error">{formError}</p>}</form></section></div></main>;
}

export default function StaffChat() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const canUseStaffChat = user?.role === "writer" || user?.role === "admin";
  return <div className="site-frame"><SiteHeader />{loading ? <ChatAccessNotice title="Checking your account" copy="Loading your staff access…" icon={<MessageSquareText size={22} />} /> : !isAuthenticated ? <ChatAccessNotice title="Staff rooms only" copy="Sign in with your Chronicle account to use the private writer and admin rooms." action="Go to posts" onAction={() => setLocation("/")} icon={<LogIn size={22} />} /> : !canUseStaffChat ? <ChatAccessNotice title="Writer or admin access needed" copy="These rooms are for approved writers and administrators. You can apply to write from your workspace." action="Open workspace" onAction={() => setLocation("/workspace")} icon={<ShieldAlert size={22} />} /> : <StaffChatDesk user={{ id: user.id, name: user.name, role: user.role }} />}</div>;
}
