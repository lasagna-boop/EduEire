// Shared moderation logic for Cloud Functions (Layer 2)
// Mirror of src/lib/moderation.ts — same word list and normalisation pipeline

import { BANNED_WORDS } from "./banned-words";

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

const PERSPECTIVE_URL =
  "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";
const TOXICITY_THRESHOLD = 0.7;
const SPAM_THRESHOLD = 0.5;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function computeSpamSignals(text: string, normalised: string): {
  spamScore: number;
  matches: string[];
  suspicious: boolean;
} {
  const matches: string[] = [];
  let score = 0;

  const hasCapsBlast =
    /[A-Z]{10,}/.test(text) ||
    ((text.match(/[a-z]/gi)?.length ?? 0) >= 10 &&
      (text.match(/[A-Z]/g)?.length ?? 0) / (text.match(/[a-z]/gi)?.length ?? 1) > 0.75);
  const hasCharRun = /(.)\1{5,}/.test(text);
  const hasLinkFlood = /(https?:\/\/\S+\s*){3,}/.test(text);
  const hasRepeatedPhrase = /\b(.{3,40})\b(?:\s+\1){2,}/i.test(
    text.toLowerCase().replaceAll(/\s+/g, " ").trim()
  );

  const compact = normalised.replaceAll(/[^a-z0-9]/g, "");
  const uniqueChars = new Set(compact.split("")).size;
  const tokens = normalised.match(/[a-z0-9]{2,}/g) ?? [];
  const avgTokenLen =
    tokens.length > 0
      ? tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length
      : 0;

  const gibberishShort = compact.length > 0 && compact.length <= 12 && uniqueChars <= 3;
  const lowInformation =
    compact.length > 0 && compact.length <= 10 && (tokens.length <= 2 || avgTokenLen <= 2.5);

  if (hasLinkFlood) {
    matches.push("spam_links");
    score += 0.35;
  }
  if (hasCapsBlast) {
    matches.push("spam_caps");
    score += 0.2;
  }
  if (hasCharRun) {
    matches.push("spam_char_run");
    score += 0.25;
  }
  if (hasRepeatedPhrase) {
    matches.push("spam_repetition");
    score += 0.2;
  }
  if (gibberishShort) {
    matches.push("gibberish_short");
    score += 0.4;
  }
  if (lowInformation) {
    matches.push("low_information");
    score += 0.3;
  }

  const suspicious = hasCapsBlast || hasCharRun || hasLinkFlood;
  if (suspicious) {
    matches.push("suspicious_pattern");
  }

  return { spamScore: clamp01(score), matches: [...new Set(matches)], suspicious };
}

export async function getToxicityScore(text: string): Promise<number> {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey) return 0;

  try {
    const res = await fetch(`${PERSPECTIVE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: { text },
        requestedAttributes: { TOXICITY: {} },
        languages: ["en"],
      }),
    });

    if (!res.ok) return 0;

    const json = await res.json();
    return json.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
  } catch {
    return 0;
  }
}

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

  const spam = computeSpamSignals(text, normalised);

  if (spam.suspicious || spam.spamScore >= SPAM_THRESHOLD) {
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

  const toxicityScore = await getToxicityScore(text);

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
