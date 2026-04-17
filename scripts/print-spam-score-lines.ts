/**
 * One line per case: `<input> - score - <σ>` (checkSpam(text) or moderateContent).
 * Run: npm run spam:scores
 */
import { moderateContent } from "../src/lib/moderation.ts";
import { checkSpam } from "../src/lib/moderationSpam.ts";
import {
  LAYER1_SPAM_FIXTURE_CASES,
  type Layer1SpamCase,
} from "../tests/fixtures/layer1SpamCases.ts";

function lineScore(c: Layer1SpamCase): number {
  if (c.mode === "checkSpam") return checkSpam(c.text).spamScore;
  return moderateContent(c.title, c.body).spamScore ?? 0;
}

function lineKey(c: Layer1SpamCase): string {
  if (c.mode === "checkSpam") return c.text.replaceAll("\n", " ").trim();
  const t = c.title.trim();
  const b = c.body.trim();
  if (t && b) return `${t} | ${b}`;
  if (t) return t;
  return b;
}

for (const c of LAYER1_SPAM_FIXTURE_CASES) {
  const key = lineKey(c);
  const score = lineScore(c);
  console.log(`${key} - score - ${score.toFixed(2)}`);
}
