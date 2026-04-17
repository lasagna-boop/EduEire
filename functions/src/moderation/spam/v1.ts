export const SPAM_THRESHOLD_V1 = 0.5;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function computeSpamSignalsV1(text: string, normalised: string): {
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
  if (suspicious) matches.push("suspicious_pattern");

  return { spamScore: clamp01(score), matches: [...new Set(matches)], suspicious };
}
