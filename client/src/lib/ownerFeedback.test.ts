import { describe, expect, it } from "vitest";
import { canLeaveOwnerFeedback, isValidOwnerFeedback } from "./ownerFeedback";

describe("private owner feedback rules", () => {
  it("only permits feedback on an unpublished post", () => {
    expect(canLeaveOwnerFeedback("unpublished")).toBe(true);
    expect(canLeaveOwnerFeedback("draft")).toBe(false);
    expect(canLeaveOwnerFeedback("published")).toBe(false);
  });

  it("requires non-empty feedback within the database length limit", () => {
    expect(isValidOwnerFeedback("  ")).toBe(false);
    expect(isValidOwnerFeedback("Please add the source for this claim.")).toBe(true);
    expect(isValidOwnerFeedback("x".repeat(8001))).toBe(false);
  });
});
