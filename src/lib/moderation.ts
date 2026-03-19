// src/lib/moderation.ts
// Layer 1 — Client-side keyword filter (Auto Reject)
//
// Performs string normalisation + regex word-boundary matching
// to catch profanity, slurs, and spam before content reaches Firestore.

import { BANNED_WORDS } from "./banned-words";

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
};

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
  const titleResult = checkProfanity(title);
  const bodyResult = checkProfanity(body);

  const allMatches = [...new Set([...titleResult.matches, ...bodyResult.matches])];

  return {
    flagged: allMatches.length > 0,
    matches: allMatches,
  };
}
