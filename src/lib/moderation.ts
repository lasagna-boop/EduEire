// src/lib/moderation.ts
// Layer 1 — Client-side keyword filter (Auto Reject)
//
// Performs string normalisation + regex word-boundary matching
// to catch profanity, slurs, and spam before content reaches Firestore.

import { BANNED_WORDS } from "./banned-words";
import { checkSpam } from "./moderationSpam";

// ==================== LEET-SPEAK SUBSTITUTION MAP ====================

const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "+": "t",
};

// ==================== NORMALISATION PIPELINE ====================

export function normalise(text: string): string {
  let s = text;

  // 1. lowercase
  s = s.toLowerCase();

  // 2. Unicode NFKD decomposition — strip diacritics (e.g. é → e)
  s = s.normalize("NFKD").replaceAll(/[\u0300-\u036f]/g, "");

  // 3. leet-speak substitution
  s = s
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("");

  // 4. collapse repeated characters (e.g. "fuuuck" → "fuck")
  s = s.replaceAll(/(.)\1{2,}/g, "$1");

  // 5. strip inserted whitespace/punctuation between letters ("f u c k" → "fuck")
  s = s.replaceAll(/\b(\w)\s+(?=\w\b)/g, "$1");

  return s;
}

// ==================== DETECTION ====================

export type ModerationResult = {
  flagged: boolean;
  matches: string[];
  spamScore?: number;
  toxicityScore?: number;
};

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function qualitySignals(title: string, body: string): { score: number; matches: string[] } {
  const t = title.trim();
  const b = body.trim();
  const matches: string[] = [];
  let score = 0;

  // Very short/low-effort thread title (e.g. "dd")
  if (t.length > 0 && t.length <= 2) {
    matches.push("low_effort_title");
    score += 0.5;
  } else if (t.length > 0 && t.length <= 4) {
    matches.push("short_title");
    score += 0.2;
  }

  // Tiny body + tiny title is often low-value spam/noise
  if (b.length > 0 && b.length <= 6 && t.length <= 4) {
    matches.push("low_effort_body");
    score += 0.25;
  }

  const compact = `${t}${b}`.toLowerCase().replaceAll(/\s+/g, "");
  const uniqueChars = new Set(compact.split("")).size;
  if (compact.length > 0 && compact.length <= 10 && uniqueChars <= 3) {
    matches.push("gibberish_short");
    score += 0.3;
  }

  return { score: clamp01(score), matches };
}

export function checkProfanity(text: string): ModerationResult {
  const normalised = normalise(text);
  const matches: string[] = [];

  for (const word of BANNED_WORDS) {
    // word-boundary regex to avoid false positives (e.g. "class" not matching "ass")
    const pattern = new RegExp(String.raw`\b${escapeRegex(word)}\b`, "gi");
    if (pattern.test(normalised)) {
      matches.push(word);
    }
  }

  return {
    flagged: matches.length > 0,
    matches,
  };
}

function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==================== COMBINED CHECK ====================

// checks title + body together, returns Red if flagged
export function moderateContent(title: string, body: string): ModerationResult {
  const combined = `${title}\n${body}`;
  const profanityResult = checkProfanity(combined);
  const spamResult = checkSpam(combined);
  const qualityResult = qualitySignals(title, body);
  const spamScore = clamp01(spamResult.spamScore + qualityResult.score);
  const toxicityScore = clamp01(profanityResult.matches.length * 0.35);

  const allMatches = [
    ...new Set([
      ...profanityResult.matches,
      ...spamResult.matches,
      ...qualityResult.matches,
    ]),
  ];

  return {
    flagged: profanityResult.flagged || spamScore >= 0.5,
    matches: allMatches,
    spamScore,
    toxicityScore,
  };
}
