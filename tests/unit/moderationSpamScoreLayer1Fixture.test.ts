/**
 * Regression suite for Layer-1 spam scoring (client) — 40 scripted cases.
 *
 * Run `npm run test:spam-fixture:v1` (or `vitest run` on this file) for verbose output plus a footer line
 * from tests/reporters/layer1SpamFixtureBatteryFooter.ts after Vitest’s summary.
 */
import { describe, expect, it } from "vitest";
import { moderateContent } from "../../src/lib/moderation";
import { checkSpam } from "../../src/lib/moderationSpam";

const THREE_URLS = "http://a.com http://b.com http://c.com";
const FOUR_URLS = "http://a.com http://b.com http://c.com http://d.com";
/** 20 letters, all caps, ratio > 0.7 — but no run of 7+ identical (avoids double-count with spam_char_run). */
const MIXED_CAPS_20 = "ABCDEFGHIJKLMNOPQRST";
/**
 * Long enough that, even with three short URLs + "earn fast" in the same string,
 * uppercase letters still exceed 70% of all Latin letters (see uppercaseRatio in moderationSpam.ts).
 */
const CAPS_DOMINANT_BLOCK = "ABCDEFGHIJKLMNOPQRST".repeat(4);
const SEVEN_A = "aaaaaaa";
/** Same length as SEVEN_A but uppercase — does not dilute uppercaseRatio when combined with caps blocks. */
const SEVEN_A_UPPER = "AAAAAAA";

describe("Layer-1 spam score — fixture battery (40 cases)", () => {
  describe("A. Benign / negative controls", () => {
    it("1. Plain academic question", () => {
      const m = moderateContent("", "Does anyone know the deadline for the CS assignment?");
      expect(m.spamScore).toBe(0);
      expect(m.flagged).toBe(false);
    });
    it("2. Thread title + body, normal tone", () => {
      const m = moderateContent(
        "Past papers",
        "Looking for past exam papers for Linear Algebra if anyone has them."
      );
      expect(m.spamScore).toBe(0);
      expect(m.flagged).toBe(false);
    });
    it("3. Empty title, short harmless body", () => {
      const m = moderateContent("", "Thanks!");
      expect(m.spamScore).toBe(0);
      expect(m.flagged).toBe(false);
    });
    it("4. Two URLs only (below link-flood threshold)", () => {
      const r = checkSpam("Check http://a.com and http://b.com for details.");
      expect(r.spamScore).toBe(0);
      expect(r.matches).toHaveLength(0);
    });
    it("5. Mixed case sentence, length < 20 (caps rule off)", () => {
      const r = checkSpam("HELLO there friend");
      expect(r.matches).not.toContain("spam_caps");
    });
  });

  describe("B. Heuristic spam — single signals (checkSpam)", () => {
    it("6. Three or more URLs → spam_links weight 0.35", () => {
      const r = checkSpam(THREE_URLS);
      expect(r.matches).toContain("spam_links");
      expect(r.spamScore).toBeCloseTo(0.35, 5);
    });
    it("7. Four URLs — same single tag, score unchanged", () => {
      const r = checkSpam(FOUR_URLS);
      expect(r.spamScore).toBeCloseTo(0.35, 5);
    });
    it("8. Keyword phrase: earn fast", () => {
      const r = checkSpam("earn fast results guaranteed");
      expect(r.matches).toContain("spam_keywords");
      expect(r.spamScore).toBeCloseTo(0.25, 5);
    });
    it("9. Keyword phrase: free money", () => {
      const r = checkSpam("free money offer today");
      expect(r.matches).toContain("spam_keywords");
    });
    it("10. Keyword phrase: click here", () => {
      const r = checkSpam("click here for details");
      expect(r.matches).toContain("spam_keywords");
    });
    it("11. Keyword phrase: dm me", () => {
      const r = checkSpam("dm me for the link");
      expect(r.matches).toContain("spam_keywords");
    });
    it("12. Keyword phrase: whatsapp", () => {
      const r = checkSpam("contact me on whatsapp");
      expect(r.matches).toContain("spam_keywords");
    });
    it("13. Keyword phrase: telegram", () => {
      const r = checkSpam("join our telegram group");
      expect(r.matches).toContain("spam_keywords");
    });
    it("14. Keyword phrase: crypto signal", () => {
      const r = checkSpam("best crypto signal channel");
      expect(r.matches).toContain("spam_keywords");
    });
    it("15. Keyword phrase: guaranteed profit", () => {
      const r = checkSpam("guaranteed profit in one week");
      expect(r.matches).toContain("spam_keywords");
    });
    it("16. Long character run (≥7 identical) → spam_char_run 0.15", () => {
      const r = checkSpam(`prefix ${SEVEN_A} suffix`);
      expect(r.matches).toContain("spam_char_run");
      expect(r.spamScore).toBeCloseTo(0.15, 5);
    });
    it("17. Uppercase blast, length ≥ 20 → spam_caps 0.20 (no 7+ run of same letter)", () => {
      const r = checkSpam(MIXED_CAPS_20);
      expect(r.matches).toContain("spam_caps");
      expect(r.matches).not.toContain("spam_char_run");
      expect(r.spamScore).toBeCloseTo(0.2, 5);
    });
    it("18. Repeated token three times → spam_repetition 0.20", () => {
      const r = checkSpam("spam spam spam");
      expect(r.matches).toContain("spam_repetition");
      expect(r.spamScore).toBeCloseTo(0.2, 5);
    });
  });

  describe("C. Heuristic spam — combined weights", () => {
    it("19. spam_links + spam_keywords = 0.35 + 0.25", () => {
      const r = checkSpam(`${THREE_URLS} earn fast`);
      expect(r.spamScore).toBeCloseTo(0.6, 5);
      expect(r.flagged).toBe(true);
    });
    it("20. spam_links + spam_char_run = 0.35 + 0.15 = 0.50 (threshold)", () => {
      const r = checkSpam(`${THREE_URLS} ${SEVEN_A}`);
      expect(r.spamScore).toBeCloseTo(0.5, 5);
      expect(r.flagged).toBe(true);
    });
    it("21. spam_caps + spam_keywords = 0.20 + 0.25 = 0.45 (below threshold)", () => {
      const r = checkSpam(`${MIXED_CAPS_20} earn fast`);
      expect(r.spamScore).toBeCloseTo(0.45, 5);
      expect(r.flagged).toBe(false);
    });
    it("22. spam_repetition + spam_keywords = 0.20 + 0.25 = 0.45", () => {
      const r = checkSpam("click here click here click here");
      expect(r.spamScore).toBeCloseTo(0.45, 5);
    });
    it("23. spam_links + spam_caps + spam_keywords = 0.80 (caps block must dominate URL letters)", () => {
      const r = checkSpam(`${THREE_URLS} ${CAPS_DOMINANT_BLOCK} earn fast`);
      expect(r.matches).toContain("spam_caps");
      expect(r.spamScore).toBeCloseTo(0.8, 5);
      expect(r.flagged).toBe(true);
    });
    it("24. All five tags fire → sum clamped to 1.0", () => {
      // Uppercase repetition so lowercase from "spam spam spam" does not drop uppercaseRatio below 0.7.
      const r = checkSpam(
        `${THREE_URLS} ${CAPS_DOMINANT_BLOCK} ${SEVEN_A_UPPER} SPAM SPAM SPAM earn fast`
      );
      expect(r.matches).toEqual(
        expect.arrayContaining([
          "spam_links",
          "spam_caps",
          "spam_char_run",
          "spam_repetition",
          "spam_keywords",
        ])
      );
      expect(r.spamScore).toBe(1);
      expect(r.flagged).toBe(true);
    });
  });

  describe("D. Quality signals (moderateContent)", () => {
    it("25. Very short title (2 letters) + empty body — quality + gibberish on compact", () => {
      const m = moderateContent("aa", "");
      expect(m.matches).toContain("low_effort_title");
      expect(m.matches).toContain("gibberish_short");
      expect(m.spamScore).toBeCloseTo(0.8, 5);
      expect(m.flagged).toBe(true);
    });
    it("26. Short title 3 chars + empty body — short_title + gibberish", () => {
      const m = moderateContent("abc", "");
      expect(m.matches).toContain("short_title");
      expect(m.matches).toContain("gibberish_short");
      expect(m.spamScore).toBeCloseTo(0.5, 5);
      expect(m.flagged).toBe(true);
    });
    it("27. Short title 4 letters, no gibberish (4 distinct in compact)", () => {
      const m = moderateContent("abcd", "");
      expect(m.matches).toContain("short_title");
      expect(m.spamScore).toBeCloseTo(0.2, 5);
    });
    it("28. Empty title, compact gibberish body (≤10 chars, ≤3 unique)", () => {
      const m = moderateContent("", "abcabcab");
      expect(m.matches).toContain("gibberish_short");
      expect(m.spamScore).toBeCloseTo(0.3, 5);
    });
    it("29. Tiny body + short title → low_effort_body (title empty avoids short-title stack)", () => {
      const m = moderateContent("", "123456");
      expect(m.matches).toContain("low_effort_body");
      expect(m.spamScore).toBeCloseTo(0.25, 5);
    });
    it("30. Two-letter title + body > 6 chars — low_effort_title only (no low_effort_body)", () => {
      const m = moderateContent("xx", "notes!!");
      expect(m.matches).toContain("low_effort_title");
      expect(m.spamScore).toBeCloseTo(0.5, 5);
      expect(m.flagged).toBe(true);
    });
  });

  describe("E. Heuristic + quality interaction", () => {
    it("31. Keyword + very short title stack (use earn fast — not in banned-word list)", () => {
      const m = moderateContent("ab", "earn fast");
      expect(m.spamScore).toBeCloseTo(0.75, 5);
      expect(m.flagged).toBe(true);
    });
    it("32. Keyword + short_title only — below 0.5 (earn fast, not click here / free money)", () => {
      const m = moderateContent("abc", "earn fast");
      expect(m.spamScore).toBeCloseTo(0.45, 5);
      expect(m.flagged).toBe(false);
    });
    it("33. Three URLs only via moderateContent — no extra quality", () => {
      const m = moderateContent("", THREE_URLS);
      expect(m.spamScore).toBeCloseTo(0.35, 5);
      expect(m.flagged).toBe(false);
    });
    it("34. spam_keywords + gibberish body", () => {
      const m = moderateContent("", "earn fast ab");
      expect(m.spamScore).toBeGreaterThanOrEqual(0.25);
    });
    it("35. Heuristic-only boundary: 0.35 < 0.5", () => {
      const m = moderateContent("", THREE_URLS);
      expect(m.spamScore).toBeLessThan(0.5);
    });
  });

  describe("F. Edge / regression", () => {
    it("36. Caps length 19 — spam_caps off (needs ≥20)", () => {
      const r = checkSpam("AAAAAAAAAAAAAAAAAAA");
      expect(r.matches).not.toContain("spam_caps");
    });
    it("37. Six identical chars — below char-run threshold (needs ≥7)", () => {
      const r = checkSpam("aaaaaa");
      expect(r.matches).not.toContain("spam_char_run");
    });
    it("38. Two-word repeat not matching repetition regex", () => {
      const r = checkSpam("ok ok");
      expect(r.matches).not.toContain("spam_repetition");
    });
    it("39. Whitespace-only title treated as empty for quality", () => {
      const m = moderateContent("   ", "Some body text here.");
      expect(m.spamScore).toBe(0);
    });
    it("40. Long benign paragraph — still zero", () => {
      const body =
        "I am writing to ask about module registration for next semester. " +
        "Could someone confirm whether the deadline is the same for part-time students?";
      const m = moderateContent("Question", body);
      expect(m.spamScore).toBe(0);
      expect(m.flagged).toBe(false);
    });
  });
});
