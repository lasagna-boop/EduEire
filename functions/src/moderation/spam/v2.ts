import { sanitizeModerationText } from "../../moderationInput";

export type SpamResultV2 = {
  flagged: boolean;
  matches: string[];
  spamScore: number;
};

export const SPAM_V2_THRESHOLD = 0.2;

export const SPAM_WEIGHTS_V2: Record<string, number> = {
  spam_links: 0.28,
  spam_caps: 0.14,
  spam_char_run: 0.12,
  spam_repetition: 0.16,
  spam_keywords: 0.2,
  spam_obfuscated_keyword: 0.18,
  spam_contact_combo: 0.12,
  spam_url_keyword_combo: 0.16,
  spam_symbol_noise: 0.1,
};

const SPAM_KEYWORDS_V2 =
  /\b(free money|guaranteed profit|dm me|whatsapp|telegram|crypto signal|click here|earn fast|limited offer|bonus now)\b/i;
const OBFUSCATED_KEYWORD_PARTS_V2 = [
  /c\W*l\W*i\W*c\W*k\W*h\W*e\W*r\W*e/i,
  /f\W*r\W*e\W*e\W*m\W*o\W*n\W*e\W*y/i,
  /e\W*a\W*r\W*n\W*f\W*a\W*s\W*t/i,
] as const;
const CONTACT_HINT_V2 = /\b(dm|direct message|telegram|whatsapp|signal me|text me)\b/i;

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
  return /(.)\1{5,}/.test(text);
}

function hasRepeatedPhrase(text: string): boolean {
  const normalized = text.toLowerCase().replaceAll(/\s+/g, " ").trim();
  return /\b(.{3,40})\b(?:\s+\1){2,}/i.test(normalized);
}

function hasObfuscatedSpamKeyword(text: string): boolean {
  return OBFUSCATED_KEYWORD_PARTS_V2.some((re) => re.test(text));
}

function punctuationRatio(text: string): number {
  if (!text) return 0;
  const punct = text.match(/[!?$%*#@^~`|<>_=+-]/g) ?? [];
  return punct.length / text.length;
}

export function checkSpamV2(text: string): SpamResultV2 {
  const safe = sanitizeModerationText(text);
  const matches: string[] = [];
  const urls = countUrls(safe);
  const keyword = SPAM_KEYWORDS_V2.test(safe);
  const contactHint = CONTACT_HINT_V2.test(safe);

  if (urls >= 3) matches.push("spam_links");
  if (uppercaseRatio(safe) > 0.68 && safe.length >= 18) matches.push("spam_caps");
  if (hasLongCharRun(safe)) matches.push("spam_char_run");
  if (hasRepeatedPhrase(safe)) matches.push("spam_repetition");
  if (keyword) matches.push("spam_keywords");
  if (hasObfuscatedSpamKeyword(safe)) matches.push("spam_obfuscated_keyword");
  if (contactHint && (urls >= 1 || keyword)) matches.push("spam_contact_combo");
  if (urls >= 2 && keyword) matches.push("spam_url_keyword_combo");
  if (punctuationRatio(safe) >= 0.2 && safe.length >= 24) matches.push("spam_symbol_noise");

  const spamScore = clamp01(
    [...new Set(matches)].reduce((sum, key) => sum + (SPAM_WEIGHTS_V2[key] ?? 0), 0)
  );

  return {
    flagged: spamScore >= SPAM_V2_THRESHOLD,
    matches: [...new Set(matches)],
    spamScore,
  };
}
