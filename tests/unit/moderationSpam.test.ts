import { describe, expect, it } from "vitest";
import { checkSpam } from "../../src/lib/moderationSpam";

describe("checkSpam", () => {
  it("flags obvious spam keywords", () => {
    const r = checkSpam("Earn fast — click here for free money today");
    expect(r.matches).toContain("spam_keywords");
    expect(r.spamScore).toBeGreaterThan(0);
  });

  it("detects multiple URLs", () => {
    const text =
      "http://a.com http://b.com http://c.com http://d.com plain";
    const r = checkSpam(text);
    expect(r.matches).toContain("spam_links");
  });

  it("returns low score for normal academic text", () => {
    const r = checkSpam(
      "Does anyone know the deadline for the CS assignment?"
    );
    expect(r.flagged).toBe(false);
    expect(r.matches.length).toBe(0);
  });
});
