/**
 * Terminal report: original input → σ breakdown → flags (Layer 1, Version 1).
 * Run: npm run spam:breakdown
 */
import { explainCheckSpamOnly, explainLayer1 } from "../src/lib/moderation.ts";
import {
  LAYER1_SPAM_FIXTURE_CASES,
  type Layer1SpamCase,
} from "../tests/fixtures/layer1SpamCases.ts";

function line(ch = "─", n = 72) {
  return ch.repeat(n);
}

function printCase(c: Layer1SpamCase) {
  console.log(`\n${line("═")}`);
  console.log(`Case ${c.id} [${c.group}] ${c.label}`);
  console.log(line("─"));

  if (c.mode === "checkSpam") {
    console.log("Mode: checkSpam(text) — heuristic layer only (no q_title/q_body/q_gib).");
    console.log("--- Original text ---");
    console.log(c.text);
    const x = explainCheckSpamOnly(c.text);
    console.log("--- Heuristic tags → weights ---");
    if (x.heuristicPerTag.length === 0) console.log("  (none)");
    else x.heuristicPerTag.forEach((p) => console.log(`  ${p.tag}: +${p.weight}`));
    console.log(`σ_spam (sum of weights, clamped): ${x.sigmaSpam.toFixed(3)}`);
    console.log(`Heuristic-only flag (σ_spam ≥ 0.5): ${x.flaggedByHeuristicRule ? "yes" : "no"}`);
    return;
  }

  console.log("Mode: moderateContent(title, body) — full Layer 1.");
  console.log(`--- Title ---\n${JSON.stringify(c.title)}`);
  console.log(`--- Body ---\n${c.body}`);
  const e = explainLayer1(c.title, c.body);
  console.log("--- Combined string S (title + newline + body) ---");
  console.log(e.combined);
  console.log("--- Profanity / banned-word (after normalise) ---");
  if (e.profanityMatches.length === 0) console.log("  (no hits)");
  else console.log(`  hits: ${e.profanityMatches.join(", ")}`);
  console.log(`  profanityFlagged: ${e.profanityFlagged}`);
  console.log(`  toxicity proxy (0.35 × #hits, clamped): ${e.toxicityProxy.toFixed(3)}`);
  console.log("--- Heuristic spam (on S) ---");
  if (e.heuristicPerTag.length === 0) console.log("  (no tags)");
  else e.heuristicPerTag.forEach((p) => console.log(`  ${p.tag}: +${p.weight}`));
  console.log(`  σ_spam: ${e.sigmaSpam.toFixed(3)}`);
  console.log("--- Quality / low-effort ---");
  const q = e.qualityDetail;
  console.log(`  q_title: ${q.qTitle.toFixed(2)}  q_body: ${q.qBody.toFixed(2)}  q_gib: ${q.qGib.toFixed(2)}`);
  console.log(`  quality tags: ${q.matches.length ? q.matches.join(", ") : "(none)"}`);
  console.log(`  σ_qual (sum clamped): ${e.sigmaQual.toFixed(3)}`);
  console.log("--- Aggregate ---");
  console.log(`  σ = clamp(σ_spam + σ_qual) = ${e.sigma.toFixed(3)}`);
  console.log(`  Layer-1 flagged (profanity OR σ ≥ 0.5): ${e.flagged ? "YES" : "no"}`);
  console.log(`  All match tags (deduped): ${e.allMatchTags.length ? e.allMatchTags.join(", ") : "(none)"}`);
}

console.log("EduÉire — Layer 1 spam score breakdown (Version 1)\n");
console.log("σ_spam: weighted heuristic tags on S.  σ_qual: title/body/gibberish.  σ = clamp(σ_spam + σ_qual).");

for (const c of LAYER1_SPAM_FIXTURE_CASES) {
  printCase(c);
}

console.log(`\n${line("═")}`);
console.log(`Done. ${LAYER1_SPAM_FIXTURE_CASES.length} cases.`);
console.log(`${line("═")}\n`);
