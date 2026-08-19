import { describe, expect, it } from "vitest";
import { isValidUsername, nativeAccountEmail, normalizeUsername } from "./username";

describe("native Chronicle usernames", () => {
  it("normalizes a username and derives its private authentication address", () => {
    expect(normalizeUsername("  Washiez_Reader  ")).toBe("washiez_reader");
    expect(nativeAccountEmail("Washiez_Reader")).toBe("washiez_reader@members.washiez.local");
  });

  it("accepts safe public usernames and rejects invalid values", () => {
    expect(isValidUsername("Washiez-Writer_7")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("not allowed")).toBe(false);
    expect(isValidUsername("name@example.com")).toBe(false);
  });
});
