import { describe, expect, it } from "vitest";
import {
  sanitizeStringArray,
  sanitizeUserEmail,
  sanitizeUserLine,
  sanitizeUserText,
} from "../../src/lib/inputSanitizer";

describe("inputSanitizer", () => {
  it("removes control chars and trims user text", () => {
    const value = "  hello\u0000 world  ";
    expect(sanitizeUserText(value, { maxChars: 120, preserveNewlines: false })).toBe("hello world");
  });

  it("normalizes and lowercases user email", () => {
    expect(sanitizeUserEmail("  USER@Example.IE  ")).toBe("user@example.ie");
  });

  it("de-duplicates and limits arrays", () => {
    const tags = sanitizeStringArray(["  Admissions  ", "Admissions", "First Year/Transition"], {
      maxItems: 2,
      maxItemChars: 40,
    });
    expect(tags).toEqual(["Admissions", "First Year/Transition"]);
  });

  it("clips overly long single-line values", () => {
    const value = sanitizeUserLine("a".repeat(200), 80);
    expect(value.length).toBe(80);
  });
});
