export const NATIVE_ACCOUNT_DOMAIN = "members.washiez.local";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return /^[A-Za-z0-9_-]{3,24}$/.test(value.trim());
}

export function nativeAccountEmail(username: string) {
  return `${normalizeUsername(username)}@${NATIVE_ACCOUNT_DOMAIN}`;
}
