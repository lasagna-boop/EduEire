import { describe, expect, it } from "vitest";
import { checkProfanity, moderateContentV2 } from "../../src/lib/moderation";
import { checkSpamV2, SPAM_V2_THRESHOLD } from "../../src/lib/moderationSpam";
import { LAYER1_SPAM_FIXTURE_CASES } from "../fixtures/layer1SpamCases";

describe("Layer-1 spam score v2 — fixture battery (same 40 inputs)", () => {
  for (const c of LAYER1_SPAM_FIXTURE_CASES) {
    it(`${c.id}. [${c.group}] ${c.label}`, () => {
      if (c.mode === "checkSpam") {
        const r = checkSpamV2(c.text);
        expect(r.spamScore).toBeGreaterThanOrEqual(0);
        expect(r.spamScore).toBeLessThanOrEqual(1);
        expect(r.flagged).toBe(r.spamScore >= SPAM_V2_THRESHOLD);
        expect(new Set(r.matches).size).toBe(r.matches.length);
        return;
      }

      const r = moderateContentV2(c.title, c.body);
      const p = checkProfanity(`${c.title}\n${c.body}`);
      const score = r.spamScore ?? 0;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(r.flagged).toBe(p.flagged || score >= SPAM_V2_THRESHOLD);
      expect(new Set(r.matches).size).toBe(r.matches.length);
    });
  }
});
