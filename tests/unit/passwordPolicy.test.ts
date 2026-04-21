import { describe, expect, it } from "vitest";
import { validatePasswordPolicy } from "../../src/lib/passwordPolicy";

describe("validatePasswordPolicy", () => {
  it("accepts strong passwords", () => {
    expect(validatePasswordPolicy("GoodPass1").ok).toBe(true);
    expect(validatePasswordPolicy("Aa1aaaaa").ok).toBe(true);
  });

  it("rejects short passwords", () => {
    const r = validatePasswordPolicy("Aa1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/8/);
  });

  it("rejects missing character classes", () => {
    expect(validatePasswordPolicy("alllowercase1").ok).toBe(false);
    expect(validatePasswordPolicy("ALLUPPERCASE1").ok).toBe(false);
    expect(validatePasswordPolicy("NoDigitsHere").ok).toBe(false);
  });
});
