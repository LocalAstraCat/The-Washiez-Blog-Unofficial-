import { describe, expect, it } from "vitest";
import { canSaveDraftToServer, draftStorageKey, hasLocalDraftContent, readLocalDraft, removeLocalDraft, writeLocalDraft } from "./draftRecovery";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const completeForm = { title: "Washiez history", body: "A sufficiently long, source-aware post body.", coverImageUrl: "", category: "History", tags: "timeline" };

describe("draft recovery", () => {
  it("keeps local draft keys separate for each writer and server draft", () => {
    expect(draftStorageKey("writer-one", null)).not.toBe(draftStorageKey("writer-two", null));
    expect(draftStorageKey("writer-one", "draft-a")).not.toBe(draftStorageKey("writer-one", "draft-b"));
  });

  it("restores valid local work and ignores malformed browser storage", () => {
    const storage = new MemoryStorage();
    const key = draftStorageKey("writer-one", null);
    writeLocalDraft(storage, key, completeForm);
    expect(readLocalDraft(storage, key)?.form).toEqual(completeForm);
    storage.setItem("bad", "not-json");
    expect(readLocalDraft(storage, "bad")).toBeNull();
    removeLocalDraft(storage, key);
    expect(readLocalDraft(storage, key)).toBeNull();
  });

  it("only schedules server saves for posts that meet database requirements", () => {
    expect(hasLocalDraftContent({ ...completeForm, title: "" })).toBe(true);
    expect(canSaveDraftToServer(completeForm)).toBe(true);
    expect(canSaveDraftToServer({ ...completeForm, title: "No" })).toBe(false);
    expect(canSaveDraftToServer({ ...completeForm, body: "Too short" })).toBe(false);
  });
});
