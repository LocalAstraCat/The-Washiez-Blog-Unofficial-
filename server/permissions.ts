export type SiteRole = "user" | "writer" | "admin";

export function canWrite(role: SiteRole) {
  return role === "writer" || role === "admin";
}

export function isAdministrator(role: SiteRole) {
  return role === "admin";
}

export function canManagePost(role: SiteRole, authorId: number, userId: number) {
  return isAdministrator(role) || authorId === userId;
}
