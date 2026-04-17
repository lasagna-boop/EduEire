import { BANNED_WORDS } from "./banned-words";
import { sanitizeModerationText } from "./moderationInput";
import {
  checkSpam,
  checkSpamV2,
  SPAM_V2_THRESHOLD,
  SPAM_WEIGHTS,
  SPAM_WEIGHTS_V2,
} from "./moderationSpam";

function contentPair(title: string, body: string) {
  const t = sanitizeModerationText(title).trim();
  const b = sanitizeModerationText(body).trim();
  return { t, b, combined: `${t}\n${b}` };
}

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

export function normalise(text: string): string {
  let s = text.toLowerCase();
  s = s.normalize("NFKD").replaceAll(/[\u0300-\u036f]/g, "");
  s = s
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("");
  s = s.replaceAll(/(.)\1{2,}/g, "$1");
  s = s.replaceAll(/\b(\w)\s+(?=\w\b)/g, "$1");
  return s;
}

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

export type QualitySignalDetail = {
  qTitle: number;
  qBody: number;
  qGib: number;
  score: number;
  matches: string[];
};

export type QualitySignalDetailV2 = {
  qTitle: number;
  qBody: number;
  qGib: number;
  qContext: number;
  score: number;
  matches: string[];
};

function qualitySignalsDetail(title: string, body: string): QualitySignalDetail {
  const t = title.trim();
  const b = body.trim();
  const matches: string[] = [];
  let qTitle = 0;
  let qBody = 0;
  let qGib = 0;

  if (t.length > 0 && t.length <= 2) {
    matches.push("low_effort_title");
    qTitle = 0.5;
  } else if (t.length > 0 && t.length <= 4) {
    matches.push("short_title");
    qTitle = 0.2;
  }

  if (b.length > 0 && b.length <= 6 && t.length <= 4) {
    matches.push("low_effort_body");
    qBody = 0.25;
  }

  const compact = `${t}${b}`.toLowerCase().replaceAll(/\s+/g, "");
  const uniqueChars = new Set(compact.split("")).size;
  if (compact.length > 0 && compact.length <= 10 && uniqueChars <= 3) {
    matches.push("gibberish_short");
    qGib = 0.3;
  }

  const score = clamp01(qTitle + qBody + qGib);
  return { qTitle, qBody, qGib, score, matches };
}

function qualitySignals(title: string, body: string): { score: number; matches: string[] } {
  const d = qualitySignalsDetail(title, body);
  return { score: d.score, matches: d.matches };
}

function qualitySignalsDetailV2(title: string, body: string): QualitySignalDetailV2 {
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
  return { qTitle, qBody, qGib, qContext, score, matches };
}

function qualitySignalsV2(title: string, body: string): { score: number; matches: string[] } {
  const d = qualitySignalsDetailV2(title, body);
  return { score: d.score, matches: d.matches };
}

export function checkProfanity(text: string): ModerationResult {
  const normalised = normalise(sanitizeModerationText(text));
  const matches: string[] = [];

  for (const word of BANNED_WORDS) {
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

export function explainCheckSpamOnly(text: string) {
  const spam = checkSpam(sanitizeModerationText(text));
  const heuristicPerTag = spam.matches.map((tag) => ({
    tag,
    weight: SPAM_WEIGHTS[tag] ?? 0,
  }));
  return {
    text,
    heuristicMatches: spam.matches,
    heuristicPerTag,
    sigmaSpam: spam.spamScore,
    flaggedByHeuristicRule: spam.flagged,
  };
}

export function explainCheckSpamOnlyV2(text: string) {
  const spam = checkSpamV2(sanitizeModerationText(text));
  const heuristicPerTag = spam.matches.map((tag) => ({
    tag,
    weight: SPAM_WEIGHTS_V2[tag] ?? 0,
  }));
  return {
    text,
    heuristicMatches: spam.matches,
    heuristicPerTag,
    sigmaSpam: spam.spamScore,
    flaggedByHeuristicRule: spam.flagged,
    threshold: SPAM_V2_THRESHOLD,
  };
}

export type Layer1Breakdown = {
  combined: string;
  profanityMatches: string[];
  profanityFlagged: boolean;
  toxicityProxy: number;
  heuristicMatches: string[];
  heuristicPerTag: { tag: string; weight: number }[];
  sigmaSpam: number;
  qualityDetail: QualitySignalDetail;
  sigmaQual: number;
  sigma: number;
  flagged: boolean;
  allMatchTags: string[];
};

export function explainLayer1(title: string, body: string): Layer1Breakdown {
  const { t, b, combined } = contentPair(title, body);
  const profanityResult = checkProfanity(combined);
  const spamResult = checkSpam(combined);
  const qualityDetail = qualitySignalsDetail(t, b);
  const sigmaSpam = spamResult.spamScore;
  const sigmaQual = qualityDetail.score;
  const sigma = clamp01(sigmaSpam + sigmaQual);
  const toxicityProxy = clamp01(profanityResult.matches.length * 0.35);
  const full = moderateContent(t, b);
  const heuristicPerTag = spamResult.matches.map((tag) => ({
    tag,
    weight: SPAM_WEIGHTS[tag] ?? 0,
  }));
  return {
    combined,
    profanityMatches: profanityResult.matches,
    profanityFlagged: profanityResult.flagged,
    toxicityProxy,
    heuristicMatches: spamResult.matches,
    heuristicPerTag,
    sigmaSpam,
    qualityDetail,
    sigmaQual,
    sigma,
    flagged: full.flagged,
    allMatchTags: full.matches,
  };
}

export function moderateContent(title: string, body: string): ModerationResult {
  const { t, b, combined } = contentPair(title, body);
  const profanityResult = checkProfanity(combined);
  const spamResult = checkSpam(combined);
  const qualityResult = qualitySignals(t, b);
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

export type Layer1BreakdownV2 = {
  combined: string;
  profanityMatches: string[];
  profanityFlagged: boolean;
  toxicityProxy: number;
  heuristicMatches: string[];
  heuristicPerTag: { tag: string; weight: number }[];
  sigmaSpam: number;
  qualityDetail: QualitySignalDetailV2;
  sigmaQual: number;
  sigma: number;
  flagged: boolean;
  allMatchTags: string[];
  threshold: number;
};

export function explainLayer1V2(title: string, body: string): Layer1BreakdownV2 {
  const { t, b, combined } = contentPair(title, body);
  const profanityResult = checkProfanity(combined);
  const spamResult = checkSpamV2(combined);
  const qualityDetail = qualitySignalsDetailV2(t, b);
  const sigmaSpam = spamResult.spamScore;
  const sigmaQual = qualityDetail.score;
  const sigma = clamp01(sigmaSpam + sigmaQual);
  const toxicityProxy = clamp01(profanityResult.matches.length * 0.35);
  const full = moderateContentV2(t, b);
  const heuristicPerTag = spamResult.matches.map((tag) => ({
    tag,
    weight: SPAM_WEIGHTS_V2[tag] ?? 0,
  }));
  return {
    combined,
    profanityMatches: profanityResult.matches,
    profanityFlagged: profanityResult.flagged,
    toxicityProxy,
    heuristicMatches: spamResult.matches,
    heuristicPerTag,
    sigmaSpam,
    qualityDetail,
    sigmaQual,
    sigma,
    flagged: full.flagged,
    allMatchTags: full.matches,
    threshold: SPAM_V2_THRESHOLD,
  };
}

export function moderateContentV2(title: string, body: string): ModerationResult {
  const { t, b, combined } = contentPair(title, body);
  const profanityResult = checkProfanity(combined);
  const spamResult = checkSpamV2(combined);
  const qualityResult = qualitySignalsV2(t, b);
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
    flagged: profanityResult.flagged || spamScore >= SPAM_V2_THRESHOLD,
    matches: allMatches,
    spamScore,
    toxicityScore,
  };
}
