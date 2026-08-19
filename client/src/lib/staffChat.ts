export type StaffChatRole = "user" | "writer" | "admin";
export type StaffChatRoomId = "admins" | "writers";
export type ChatRoleMention = "admins" | "authors" | "owner";

export const CHAT_RETENTION_MONTHS = 3;

export function canAccessStaffChatRoom(role: StaffChatRole, roomId: StaffChatRoomId) {
  return role === "admin" || (role === "writer" && roomId === "writers");
}

export function canManageChatPins(role: StaffChatRole) {
  return role === "admin";
}

export function normalizeChatSearch(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function chatRetentionCutoff(now: Date) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - CHAT_RETENTION_MONTHS);
  return cutoff;
}

export function isExpiredUnpinnedChatMessage(message: { createdAt: string; isPinned: boolean }, now: Date) {
  return !message.isPinned && new Date(message.createdAt).getTime() < chatRetentionCutoff(now).getTime();
}

export function chatMentionRoles(body: string): ChatRoleMention[] {
  const text = body.toLowerCase();
  return (["admins", "authors", "owner"] as ChatRoleMention[]).filter((mention) => new RegExp(`(^|\\s)@${mention}(?=\\s|$|[.,!?;:])`, "i").test(text));
}

export function messageMentionsViewer(message: { body: string }, user: { id: string; role: StaffChatRole }, ownerId: string | null) {
  const mentions = chatMentionRoles(message.body);
  return (mentions.includes("admins") && user.role === "admin")
    || (mentions.includes("authors") && (user.role === "writer" || user.role === "admin"))
    || (mentions.includes("owner") && ownerId === user.id);
}
