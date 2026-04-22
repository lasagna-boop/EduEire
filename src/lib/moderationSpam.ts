import { sanitizeModerationText } from "./moderationInput";

export type SpamResult = {
  flagged: boolean;
  matches: string[];
  spamScore: number;
};

export const SPAM_WEIGHTS: Record<string, number> = {
  spam_links: 0.35,
  spam_caps: 0.2,
  spam_char_run: 0.15,
  spam_repetition: 0.2,
  spam_keywords: 0.25,
};

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function countUrls(text: string): number {
  const matches = text.match(/https?:\/\/[^\s]+/gi);
  return matches ? matches.length : 0;
}

function uppercaseRatio(text: string): number {
  const letters = text.match(/[a-z]/gi) ?? [];
  if (letters.length === 0) return 0;
  const upper = text.match(/[A-Z]/g) ?? [];
  return upper.length / letters.length;
}

function hasLongCharRun(text: string): boolean {
  return /(.)\1{6,}/.test(text);
}

function hasRepeatedPhrase(text: string): boolean {
  const normalized = text.toLowerCase().replaceAll(/\s+/g, " ").trim();
  return /\b(.{3,40})\b(?:\s+\1){2,}/i.test(normalized);
}

function hasSpamKeywords(text: string): boolean {
  return /\b(free money|guaranteed profit|dm me|whatsapp|telegram|crypto signal|click here|earn fast)\b/i.test(
    text
  );
}

export function checkSpam(text: string): SpamResult {
  const safe = sanitizeModerationText(text);
  const matches: string[] = [];

  if (countUrls(safe) >= 3) matches.push("spam_links");
  if (uppercaseRatio(safe) > 0.7 && safe.length >= 20) matches.push("spam_caps");
  if (hasLongCharRun(safe)) matches.push("spam_char_run");
  if (hasRepeatedPhrase(safe)) matches.push("spam_repetition");
  if (hasSpamKeywords(safe)) matches.push("spam_keywords");

  const spamScore = clamp01(
    matches.reduce((sum, key) => sum + (SPAM_WEIGHTS[key] ?? 0), 0)
  );

  return {
    flagged: spamScore >= 0.5,
    matches,
    spamScore,
  };
}

export {
  checkSpamV2,
  SPAM_V2_THRESHOLD,
  SPAM_WEIGHTS_V2,
  type SpamResultV2,
} from "./moderation/spam/v2";

