export type DraftForm = {
  title: string;
  body: string;
  coverImageUrl: string;
  category: string;
  tags: string;
};

export type LocalDraftSnapshot = { form: DraftForm; savedAt: string };

export const AUTOSAVE_DELAY_MS = 900;
const STORAGE_PREFIX = "washiez-chronicle:draft";

export function draftStorageKey(userId: string, draftId: string | null) {
  return `${STORAGE_PREFIX}:${userId}:${draftId ?? "new"}`;
}

export function hasLocalDraftContent(form: DraftForm) {
  return Boolean(form.title.trim() || form.body.trim() || form.coverImageUrl.trim() || form.tags.trim());
}

export function canSaveDraftToServer(form: DraftForm) {
  return form.title.trim().length >= 4 && form.body.trim().length >= 20 && form.category.trim().length >= 2;
}

function isDraftForm(value: unknown): value is DraftForm {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["title", "body", "coverImageUrl", "category", "tags"].every((key) => typeof candidate[key] === "string");
}

export function readLocalDraft(storage: Pick<Storage, "getItem">, key: string): LocalDraftSnapshot | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { form?: unknown; savedAt?: unknown };
    if (!isDraftForm(parsed.form) || typeof parsed.savedAt !== "string") return null;
    return { form: parsed.form, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function writeLocalDraft(storage: Pick<Storage, "setItem">, key: string, form: DraftForm) {
  storage.setItem(key, JSON.stringify({ form, savedAt: new Date().toISOString() } satisfies LocalDraftSnapshot));
}

export function removeLocalDraft(storage: Pick<Storage, "removeItem">, key: string) {
  storage.removeItem(key);
}
