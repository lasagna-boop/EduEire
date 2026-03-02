// Shared moderation logic for Cloud Functions (Layer 2)
// Mirror of src/lib/moderation.ts — same word list and normalisation pipeline

import { BANNED_WORDS } from "./banned-words";

const LEET_MAP: Record<string, string> = {
  "@": "a", "4": "a", "8": "b", "3": "e", "1": "i", "!": "i",
  "0": "o", "$": "s", "5": "s", "7": "t", "+": "t",
};

export function normalise(text: string): string {
  let s = text.toLowerCase();
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.split("").map((ch) => LEET_MAP[ch] ?? ch).join("");
  s = s.replace(/(.)\1{2,}/g, "$1");
  s = s.replace(/\b(\w)\s+(?=\w\b)/g, "$1");
  return s;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ModerationVerdict = "approved" | "rejected" | "pending_review";

export interface ModerationResult {
  verdict: ModerationVerdict;
  matches: string[];
  toxicityScore?: number;
}

const PERSPECTIVE_URL =
  "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";
const TOXICITY_THRESHOLD = 0.7;

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
  const matches: string[] = [];

  for (const word of BANNED_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    if (pattern.test(normalised)) {
      matches.push(word);
    }
  }

  if (matches.length > 0) {
    return { verdict: "rejected", matches };
  }

  const suspiciousPatterns =
    /[A-Z]{10,}/.test(text) ||
    /(.)\1{5,}/.test(text) ||
    /(https?:\/\/\S+\s*){3,}/.test(text);

  if (suspiciousPatterns) {
    return { verdict: "pending_review", matches: ["suspicious_pattern"] };
  }

  return { verdict: "approved", matches: [] };
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
    };
  }

  return { verdict: "approved", matches: [], toxicityScore };
}
