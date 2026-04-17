// Shared moderation logic for Cloud Functions (Layer 2)
// Mirror of src/lib/moderation.ts — same word list and normalisation pipeline

import { BANNED_WORDS } from "./banned-words";
import { computeSpamSignalsV1, SPAM_THRESHOLD_V1 } from "./moderation/spam/v1";
import { getPerspectiveToxicityScore } from "./moderation/toxicity/perspective";

const LEET_MAP: Record<string, string> = {
  "@": "a", "4": "a", "8": "b", "3": "e", "1": "i", "!": "i",
  "0": "o", "$": "s", "5": "s", "7": "t", "+": "t",
};

export function normalise(text: string): string {
  let s = text.toLowerCase();
  s = s.normalize("NFKD").replaceAll(/[\u0300-\u036f]/g, "");
  s = s.split("").map((ch) => LEET_MAP[ch] ?? ch).join("");
  s = s.replaceAll(/(.)\1{2,}/g, "$1");
  s = s.replaceAll(/\b(\w)\s+(?=\w\b)/g, "$1");
  return s;
}

function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ModerationVerdict = "approved" | "rejected" | "pending_review";

export interface ModerationResult {
  verdict: ModerationVerdict;
  matches: string[];
  toxicityScore?: number;
  spamScore?: number;
}

const TOXICITY_THRESHOLD = 0.7;

export function moderateKeywords(text: string): ModerationResult {
  const normalised = normalise(text);
  const keywordMatches: string[] = [];

  for (const word of BANNED_WORDS) {
    const pattern = new RegExp(String.raw`\b${escapeRegex(word)}\b`, "gi");
    if (pattern.test(normalised)) {
      keywordMatches.push(word);
    }
  }

  if (keywordMatches.length > 0) {
    return { verdict: "rejected", matches: keywordMatches };
  }

  const spam = computeSpamSignalsV1(text, normalised);

  if (spam.suspicious || spam.spamScore >= SPAM_THRESHOLD_V1) {
    return {
      verdict: "pending_review",
      matches: spam.matches,
      spamScore: spam.spamScore,
    };
  }

  return { verdict: "approved", matches: [], spamScore: spam.spamScore };
}

export async function moderate(text: string): Promise<ModerationResult> {
  const keywordResult = moderateKeywords(text);

  if (keywordResult.verdict === "rejected") {
    return keywordResult;
  }

  const toxicityScore = await getPerspectiveToxicityScore(text);

  if (keywordResult.verdict === "pending_review") {
    return { ...keywordResult, toxicityScore };
  }

  if (toxicityScore >= TOXICITY_THRESHOLD) {
    return {
      verdict: "pending_review",
      matches: ["ml_toxicity"],
      toxicityScore,
      spamScore: keywordResult.spamScore,
    };
  }

  return { verdict: "approved", matches: [], toxicityScore, spamScore: keywordResult.spamScore };
}
