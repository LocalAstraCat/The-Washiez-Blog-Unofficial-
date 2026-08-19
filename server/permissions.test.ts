import { describe, expect, it } from "vitest";
import { canManagePost, canWrite, isAdministrator } from "./permissions";

describe("editorial permissions", () => {
  it("allows writers and administrators to create or edit content", () => {
    expect(canWrite("writer")).toBe(true);
    expect(canWrite("admin")).toBe(true);
    expect(canWrite("user")).toBe(false);
  });

  it("keeps post management with the author or an administrator", () => {
    expect(canManagePost("writer", 4, 4)).toBe(true);
    expect(canManagePost("writer", 4, 7)).toBe(false);
    expect(canManagePost("admin", 4, 7)).toBe(true);
    expect(isAdministrator("admin")).toBe(true);
    expect(isAdministrator("writer")).toBe(false);
  });
});
