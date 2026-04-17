import { describe, expect, it } from "vitest";
import { moderateContent, moderateContentV2 } from "../../src/lib/moderation";
import { checkSpam, checkSpamV2 } from "../../src/lib/moderationSpam";
import { LAYER1_SPAM_FIXTURE_CASES } from "../fixtures/layer1SpamCases";

type Row = {
  id: number;
  group: string;
  label: string;
  originalText: string;
  v1Score: number;
  v2Score: number;
  v1Flagged: boolean;
  v2Flagged: boolean;
};

/**
 * Manual ground-truth labels for "true spam" in the fixed 40-case Layer-1 fixture.
 * (Used only for comparison reporting; does not affect model scoring.)
 */
const TRUE_SPAM_CASE_IDS = new Set([
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 33, 35,
]);

function toOriginalText(index: number): string {
  const c = LAYER1_SPAM_FIXTURE_CASES[index];
  if (c.mode === "checkSpam") return c.text.replaceAll("\n", " ").trim();
  const title = c.title.trim();
  const body = c.body.trim();
  if (title && body) return `${title} | ${body}`;
  if (title) return title;
  return body;
}

function evaluateRow(index: number): Row {
  const c = LAYER1_SPAM_FIXTURE_CASES[index];
  if (c.mode === "checkSpam") {
    const v1 = checkSpam(c.text);
    const v2 = checkSpamV2(c.text);
    return {
      id: c.id,
      group: c.group,
      label: c.label,
      originalText: toOriginalText(index),
      v1Score: v1.spamScore,
      v2Score: v2.spamScore,
      v1Flagged: v1.flagged,
      v2Flagged: v2.flagged,
    };
  }

  const v1 = moderateContent(c.title, c.body);
  const v2 = moderateContentV2(c.title, c.body);
  return {
    id: c.id,
    group: c.group,
    label: c.label,
    originalText: toOriginalText(index),
    v1Score: v1.spamScore ?? 0,
    v2Score: v2.spamScore ?? 0,
    v1Flagged: v1.flagged,
    v2Flagged: v2.flagged,
  };
}

describe("Layer-1 spam score comparison (same 40 fixture inputs)", () => {
  it("prints per-case breakdown and arithmetic means for v1 vs v2", () => {
    const rows = LAYER1_SPAM_FIXTURE_CASES.map((_, index) => evaluateRow(index));

    expect(rows).toHaveLength(40);
    rows.forEach((r) => {
      expect(r.v1Score).toBeGreaterThanOrEqual(0);
      expect(r.v1Score).toBeLessThanOrEqual(1);
      expect(r.v2Score).toBeGreaterThanOrEqual(0);
      expect(r.v2Score).toBeLessThanOrEqual(1);
    });

    let v1Sum = 0;
    let v2Sum = 0;
    let v1Flagged = 0;
    let v2Flagged = 0;
    let v1TrueSpamDetected = 0;
    let v2TrueSpamDetected = 0;

    console.log(
      "\n[Layer-1 fixture 40-case breakdown] id | group | v1 | v2 | delta | label | original"
    );
    rows.forEach((r) => {
      v1Sum += r.v1Score;
      v2Sum += r.v2Score;
      if (r.v1Flagged) v1Flagged += 1;
      if (r.v2Flagged) v2Flagged += 1;
      if (TRUE_SPAM_CASE_IDS.has(r.id) && r.v1Flagged) v1TrueSpamDetected += 1;
      if (TRUE_SPAM_CASE_IDS.has(r.id) && r.v2Flagged) v2TrueSpamDetected += 1;

      const delta = r.v2Score - r.v1Score;
      const sign = delta >= 0 ? "+" : "";
      console.log(
        `${r.id.toString().padStart(2, "0")} | ${r.group} | ${r.v1Score.toFixed(2)} | ${r.v2Score.toFixed(2)} | ${sign}${delta.toFixed(2)} | ${r.label} | ${r.originalText}`
      );
    });

    const n = rows.length;
    const v1Mean = v1Sum / n;
    const v2Mean = v2Sum / n;
    const meanDelta = v2Mean - v1Mean;
    const meanDeltaSign = meanDelta >= 0 ? "+" : "";

    console.log("\n[Layer-1 fixture 40-case averages]");
    console.log(`v1_mean = ${v1Mean.toFixed(4)}`);
    console.log(`v2_mean = ${v2Mean.toFixed(4)}`);
    console.log(`delta_mean = ${meanDeltaSign}${meanDelta.toFixed(4)}`);
    console.log(`flagged_count: v1=${v1Flagged}/40, v2=${v2Flagged}/40`);
    console.log(
      `true_spam_count: ${TRUE_SPAM_CASE_IDS.size}/40 (manual ground truth); detected_true_spam: v1=${v1TrueSpamDetected}/${TRUE_SPAM_CASE_IDS.size}, v2=${v2TrueSpamDetected}/${TRUE_SPAM_CASE_IDS.size}\n`
    );

    expect(Number.isFinite(v1Mean)).toBe(true);
    expect(Number.isFinite(v2Mean)).toBe(true);
  });
});
