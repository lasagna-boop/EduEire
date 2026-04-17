import { describe, expect, it } from "vitest";
import { moderateContentV2 } from "../../src/lib/moderation";
import { checkSpam, checkSpamV2 } from "../../src/lib/moderationSpam";

describe("checkSpamV2", () => {
  it("catches obfuscated CTA keywords better than v1", () => {
    const sample = "c.l.i.c.k h.e.r.e now for b0nus";
    const v1 = checkSpam(sample);
    const v2 = checkSpamV2(sample);

    expect(v1.flagged).toBe(false);
    expect(v2.matches).toContain("spam_obfuscated_keyword");
    expect(v2.spamScore).toBeGreaterThan(v1.spamScore);
  });

  it("raises risk on URL + promo combination that v1 under-scores", () => {
    const sample = "http://a.com http://b.com earn fast with guaranteed profit";
    const v1 = checkSpam(sample);
    const v2 = checkSpamV2(sample);

    expect(v1.flagged).toBe(false);
    expect(v2.matches).toEqual(
      expect.arrayContaining(["spam_keywords", "spam_url_keyword_combo"])
    );
    expect(v2.flagged).toBe(true);
  });

  it("keeps benign academic question unflagged", () => {
    const sample = "Could anyone share the Linear Algebra assignment rubric?";
    const v2 = checkSpamV2(sample);
    expect(v2.flagged).toBe(false);
    expect(v2.spamScore).toBeLessThan(0.2);
  });
});

describe("moderateContentV2", () => {
  it("flags short low-context promotional post that v1 may miss", () => {
    const r = moderateContentV2("ab", "dm me earn fast");
    expect(r.flagged).toBe(true);
    expect(r.spamScore).toBeGreaterThanOrEqual(0.45);
  });

  it("keeps long benign post unflagged", () => {
    const r = moderateContentV2(
      "Question",
      "I am writing to ask about module registration for next semester. Could someone confirm whether the deadline is the same for part-time students?"
    );
    expect(r.flagged).toBe(false);
  });
});
