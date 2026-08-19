import { describe, expect, it } from "vitest";
import { canPinPost, withPinnedPostFirst } from "./pinning";

describe("single pinned post helpers", () => {
  it("moves the configured pinned post to the first archive position without mutating the source order", () => {
    const source = [{ id: "older" }, { id: "pinned" }, { id: "newer" }];
    const ordered = withPinnedPostFirst(source, "pinned");
    expect(ordered.map((post) => post.id)).toEqual(["pinned", "older", "newer"]);
    expect(ordered.filter((post) => post.isPinned)).toHaveLength(1);
    expect(source.map((post) => post.id)).toEqual(["older", "pinned", "newer"]);
  });

  it("only permits published posts to be selected for pinning", () => {
    expect(canPinPost("published")).toBe(true);
    expect(canPinPost("draft")).toBe(false);
    expect(canPinPost("unpublished")).toBe(false);
  });
});
