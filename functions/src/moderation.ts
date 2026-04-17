import { BANNED_WORDS } from "./banned-words";
import { sanitizeModerationText } from "./moderationInput";
import { checkSpamV2, SPAM_V2_THRESHOLD } from "./moderation/spam/v2";
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

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function qualitySignalsV2(title: string, body: string): { score: number; matches: string[] } {
  const t = title.trim();
  const b = body.trim();
  const matches: string[] = [];
  let qTitle = 0;
  let qBody = 0;
  let qGib = 0;
  let qContext = 0;

  if (t.length > 0 && t.length <= 2) {
    matches.push("low_effort_title_v2");
    qTitle = 0.45;
  } else if (t.length > 0 && t.length <= 4) {
    matches.push("short_title_v2");
    qTitle = 0.2;
  }

  if (b.length > 0 && b.length <= 8 && t.length <= 6) {
    matches.push("low_effort_body_v2");
    qBody = 0.28;
  }

  const compact = `${t}${b}`.toLowerCase().replaceAll(/\s+/g, "");
  const uniqueChars = new Set(compact.split("")).size;
  if (compact.length > 0 && compact.length <= 14 && uniqueChars <= 4) {
    matches.push("gibberish_short_v2");
    qGib = 0.28;
  }

  const tokenCount = b.length === 0 ? 0 : b.split(/\s+/).filter(Boolean).length;
  if (tokenCount > 0 && tokenCount <= 3 && b.length <= 20) {
    matches.push("very_low_context_v2");
    qContext = 0.12;
  }

  const score = clamp01(qTitle + qBody + qGib + qContext);
  return { score, matches };
}

export type ModerationVerdict = "approved" | "rejected" | "pending_review";

export interface ModerationResult {
  verdict: ModerationVerdict;
  matches: string[];
  toxicityScore?: number;
  spamScore?: number;
}

const TOXICITY_THRESHOLD = 0.7;

export function moderateLayer1Keywords(title: string, body: string): ModerationResult {
  const t = sanitizeModerationText(title).trim();
  const b = sanitizeModerationText(body).trim();
  const combined = `${t}\n${b}`;
  const normalised = normalise(combined);
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

  const spam = checkSpamV2(combined);
  const quality = qualitySignalsV2(t, b);
  const spamScore = clamp01(spam.spamScore + quality.score);
  const allMatches = [...new Set([...spam.matches, ...quality.matches])];

  if (spamScore >= SPAM_V2_THRESHOLD) {
    return {
      verdict: "pending_review",
      matches: allMatches,
      spamScore,
    };
  }

  return { verdict: "approved", matches: [], spamScore };
}

export function moderateKeywords(text: string): ModerationResult {
  return moderateLayer1Keywords("", text);
}

async function finalizeWithPerspective(
  combinedForMl: string,
  keywordResult: ModerationResult
): Promise<ModerationResult> {
  if (keywordResult.verdict === "rejected") {
    return keywordResult;
  }

  const toxicityScore = await getPerspectiveToxicityScore(combinedForMl);

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

export async function moderate(text: string): Promise<ModerationResult> {
  const trimmed = sanitizeModerationText(text).trim();
  return finalizeWithPerspective(trimmed, moderateLayer1Keywords("", trimmed));
}

export async function moderateThreadContent(title: string, body: string): Promise<ModerationResult> {
  const t = sanitizeModerationText(title).trim();
  const b = sanitizeModerationText(body).trim();
  const combined = `${t}\n${b}`;
  return finalizeWithPerspective(combined, moderateLayer1Keywords(t, b));
}
