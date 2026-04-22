/**
 * Credibility scoring model (v1)
 * --------------------------------
 * This module contains a deterministic, fully manual formula for content credibility.
 *
 * Goals:
 * 1) Keep the model interpretable (good for report/defense).
 * 2) Use only internal project signals (no external ML model required here).
 * 3) Avoid runaway effects (log/tanh saturation + clamps).
 *
 * Output:
 * - credibility score in [0..100]
 * - optional component breakdown for explainability/debugging
 */

export type ModerationStatus = "approved" | "pending_review" | "rejected";

/** Nullable Firestore / JSON field stored on credibility input snapshots. */
type NullableFirestoreField = unknown | null;

export type UserCredibilitySnapshot = {
  studentEmailConfirmed: boolean;
  accessMode: "full" | "read_only";
  createdAt?: unknown;
  subscriptions?: string[];

  approvedPostsCount?: number;
  approvedCommentsCount?: number;
  rejectedContentCount?: number;
  pendingReviewCount?: number;

  cumulativeThreadScore?: number;
  cumulativeCommentScore?: number;
  helpfulMarksCount?: number;

  totalThreadsCount?: number;
  totalCommentsCount?: number;
  lastContributionAt?: unknown;
  activeDays30d?: number;

  reportsAgainstCount?: number;
  confirmedReportsCount?: number;
};

export type ContentCredibilitySnapshot = {
  score?: number;
  moderationStatus?: ModerationStatus | string;
  toxicityScore?: number;
  spamScore?: number;
  createdAt?: unknown;
};

export type ThreadCredibilityInput = {
  author: UserCredibilitySnapshot;
  thread: ContentCredibilitySnapshot & { communityId?: string };
};

export type CommentCredibilityInput = {
  author: UserCredibilitySnapshot;
  threadContext?: { communityId?: string };
  comment: ContentCredibilitySnapshot & { ancestorIds?: string[] };
};

export type CredibilityBreakdown = {
  verificationSignal: number;
  accountAgeNorm: number;
  communityAffinity: number;
  contributionVolumeNorm: number;
  qualityScoreNorm: number;
  freshnessFactor: number;
  itemScoreNorm: number;
  approvalBalance: number;
  helpfulNorm: number;
  depthPenaltyNorm: number;
  reportPenaltyNorm: number;
  riskPenaltyNorm: number;
  rawLinearScore: number;
  boundedScore01: number;
};

export type CredibilityResult = {
  score: number;
  breakdown: CredibilityBreakdown;
};

/** Written on each thread/post so every input used for the last run lives on one document. */
export type CredibilityInputsDocument = {
  authorId: string;
  kind: "thread" | "comment";
  modelVersion: string;
  threadId?: string;
  postId?: string | null;

  studentEmailConfirmed: boolean;
  accessMode: "full" | "read_only";
  authorCreatedAt: NullableFirestoreField;
  subscriptions: string[];

  approvedPostsCount: number;
  approvedCommentsCount: number;
  rejectedContentCount: number;
  pendingReviewCount: number;

  cumulativeThreadScore: number;
  cumulativeCommentScore: number;
  helpfulMarksCount: number;

  totalThreadsCount: number;
  totalCommentsCount: number;
  lastContributionAt: NullableFirestoreField;

  reportsAgainstCount: number;
  confirmedReportsCount: number;

  /** Parent thread community (for comments: thread’s communityId). */
  threadCommunityId: string | null;
  contentScore: number;
  contentModerationStatus: string;
  contentToxicityScore: number;
  contentSpamScore: number;
  contentCreatedAt: NullableFirestoreField;
  /** 0 for threads; length of ancestorIds for comments. */
  commentAncestorDepth: number;
};

export const CREDIBILITY_MODEL_VERSION = "v1";

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function serializeThreadCredibilityInput(
  authorId: string,
  threadId: string,
  input: ThreadCredibilityInput
): CredibilityInputsDocument {
  const a = input.author;
  const t = input.thread;
  return {
    authorId,
    kind: "thread",
    modelVersion: CREDIBILITY_MODEL_VERSION,
    threadId,
    postId: null,
    studentEmailConfirmed: !!a.studentEmailConfirmed,
    accessMode: a.accessMode === "read_only" ? "read_only" : "full",
    authorCreatedAt: a.createdAt ?? null,
    subscriptions: Array.isArray(a.subscriptions) ? [...a.subscriptions] : [],
    approvedPostsCount: num(a.approvedPostsCount, 0),
    approvedCommentsCount: num(a.approvedCommentsCount, 0),
    rejectedContentCount: num(a.rejectedContentCount, 0),
    pendingReviewCount: num(a.pendingReviewCount, 0),
    cumulativeThreadScore: num(a.cumulativeThreadScore, 0),
    cumulativeCommentScore: num(a.cumulativeCommentScore, 0),
    helpfulMarksCount: num(a.helpfulMarksCount, 0),
    totalThreadsCount: num(a.totalThreadsCount, 0),
    totalCommentsCount: num(a.totalCommentsCount, 0),
    lastContributionAt: a.lastContributionAt ?? null,
    reportsAgainstCount: num(a.reportsAgainstCount, 0),
    confirmedReportsCount: num(a.confirmedReportsCount, 0),
    threadCommunityId: t.communityId ?? null,
    contentScore: num(t.score, 0),
    contentModerationStatus: String(t.moderationStatus ?? "approved"),
    contentToxicityScore: num(t.toxicityScore, 0),
    contentSpamScore: num(t.spamScore, 0),
    contentCreatedAt: t.createdAt ?? null,
    commentAncestorDepth: 0,
  };
}

export function serializeCommentCredibilityInput(
  authorId: string,
  threadId: string,
  postId: string,
  input: CommentCredibilityInput
): CredibilityInputsDocument {
  const a = input.author;
  const c = input.comment;
  const depth = Array.isArray(c.ancestorIds) ? c.ancestorIds.length : 0;
  return {
    authorId,
    kind: "comment",
    modelVersion: CREDIBILITY_MODEL_VERSION,
    threadId,
    postId,
    studentEmailConfirmed: !!a.studentEmailConfirmed,
    accessMode: a.accessMode === "read_only" ? "read_only" : "full",
    authorCreatedAt: a.createdAt ?? null,
    subscriptions: Array.isArray(a.subscriptions) ? [...a.subscriptions] : [],
    approvedPostsCount: num(a.approvedPostsCount, 0),
    approvedCommentsCount: num(a.approvedCommentsCount, 0),
    rejectedContentCount: num(a.rejectedContentCount, 0),
    pendingReviewCount: num(a.pendingReviewCount, 0),
    cumulativeThreadScore: num(a.cumulativeThreadScore, 0),
    cumulativeCommentScore: num(a.cumulativeCommentScore, 0),
    helpfulMarksCount: num(a.helpfulMarksCount, 0),
    totalThreadsCount: num(a.totalThreadsCount, 0),
    totalCommentsCount: num(a.totalCommentsCount, 0),
    lastContributionAt: a.lastContributionAt ?? null,
    reportsAgainstCount: num(a.reportsAgainstCount, 0),
    confirmedReportsCount: num(a.confirmedReportsCount, 0),
    threadCommunityId: input.threadContext?.communityId ?? null,
    contentScore: num(c.score, 0),
    contentModerationStatus: String(c.moderationStatus ?? "approved"),
    contentToxicityScore: num(c.toxicityScore, 0),
    contentSpamScore: num(c.spamScore, 0),
    contentCreatedAt: c.createdAt ?? null,
    commentAncestorDepth: depth,
  };
}

function clamp01(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Accepts Firestore Timestamp-like objects, Date, number or ISO strings.
 * Returns epoch millis or null if not parseable.
 */
function toMillis(raw: unknown): number | null {
  if (!raw) return null;

  if (
    typeof raw === "object" &&
    raw !== null &&
    "toMillis" in raw &&
    typeof (raw as { toMillis: () => number }).toMillis === "function"
  ) {
    return (raw as { toMillis: () => number }).toMillis();
  }

  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  const parsed = Date.parse(String(raw));
  if (Number.isFinite(parsed)) return parsed;
  return null;
}

function daysSince(ts: unknown, nowMs: number): number {
  const millis = toMillis(ts);
  if (!millis) return 3650; // if unknown, treat as very old
  const d = (nowMs - millis) / (24 * 60 * 60 * 1000);
  return d < 0 ? 0 : d;
}

function parseStatus(value: unknown): ModerationStatus {
  if (value === "rejected") return "rejected";
  if (value === "pending_review") return "pending_review";
  return "approved";
}

function normalizeContributionVolume(totalContributions: number): number {
  // log1p compresses huge counts; 120 acts as a practical saturation scale.
  const numerator = Math.log1p(Math.max(0, totalContributions));
  const denominator = Math.log1p(120);
  return clamp01(numerator / denominator);
}

function normalizeScoreWithTanh(value: number, scale: number): number {
  // Maps roughly into [-1..1], then converted to [0..1].
  const t = Math.tanh(value / scale);
  return clamp01((t + 1) / 2);
}

function moderationStatusPenalty(status: ModerationStatus): number {
  if (status === "rejected") return 0.95;
  if (status === "pending_review") return 0.35;
  return 0;
}

function moderationRiskPenalty(
  status: ModerationStatus,
  toxicityScore: number,
  spamScore: number
): number {
  // Status acts as a strong prior on risk.
  // Approved: minimal status penalty; Pending: medium; Rejected: very high.
  const statusPenalty = moderationStatusPenalty(status);

  // Toxicity/spam contribute smoothly, so small noise does not over-penalize.
  return clamp01(statusPenalty + 0.55 * clamp01(toxicityScore) + 0.35 * clamp01(spamScore));
}

function buildSharedSignals(
  author: UserCredibilitySnapshot,
  item: ContentCredibilitySnapshot,
  communityId: string | undefined,
  depth: number,
  nowMs: number
): CredibilityBreakdown {
  const verificationSignal =
    author.studentEmailConfirmed && author.accessMode === "full" ? 1 : 0;

  const accountAgeDays = daysSince(author.createdAt, nowMs);
  const accountAgeNorm = clamp01(accountAgeDays / 365);

  const subscriptions = Array.isArray(author.subscriptions) ? author.subscriptions : [];
  const communityAffinity =
    communityId && subscriptions.includes(communityId) ? 1 : 0;

  const totalThreads = asNumber(author.totalThreadsCount, 0);
  const totalComments = asNumber(author.totalCommentsCount, 0);
  const totalContributions = Math.max(0, totalThreads + totalComments);
  const contributionVolumeNorm = normalizeContributionVolume(totalContributions);

  const cumulativeThread = asNumber(author.cumulativeThreadScore, 0);
  const cumulativeComment = asNumber(author.cumulativeCommentScore, 0);
  const qualityScoreNorm = normalizeScoreWithTanh(cumulativeThread + cumulativeComment, 25);

  const freshnessDays = daysSince(author.lastContributionAt, nowMs);
  const freshnessFactor = Math.exp(-freshnessDays / 45);

  const itemScoreNorm = normalizeScoreWithTanh(asNumber(item.score, 0), 12);

  const approved = Math.max(
    0,
    asNumber(author.approvedPostsCount, 0) + asNumber(author.approvedCommentsCount, 0)
  );
  const rejected = Math.max(0, asNumber(author.rejectedContentCount, 0));
  const approvalBalance = clamp01((approved - rejected + totalContributions) / (2 * totalContributions + 1));

  const helpful = Math.max(0, asNumber(author.helpfulMarksCount, 0));
  const helpfulNorm = clamp01(Math.log1p(helpful) / Math.log1p(100));

  const depthPenaltyNorm = clamp01(Math.max(0, depth) / 6);

  const reports = Math.max(0, asNumber(author.reportsAgainstCount, 0));
  const confirmedReports = Math.max(0, asNumber(author.confirmedReportsCount, 0));
  const reportPenaltyNorm = clamp01((confirmedReports + 0.4 * reports) / (totalContributions + 5));

  const status = parseStatus(item.moderationStatus);
  const riskPenaltyNorm = moderationRiskPenalty(
    status,
    asNumber(item.toxicityScore, 0),
    asNumber(item.spamScore, 0)
  );

  const rawLinearScore =
    0.16 * verificationSignal +
    0.08 * accountAgeNorm +
    0.07 * communityAffinity +
    0.12 * contributionVolumeNorm +
    0.16 * qualityScoreNorm +
    0.08 * freshnessFactor +
    0.1 * itemScoreNorm +
    0.09 * approvalBalance +
    0.08 * helpfulNorm -
    0.06 * depthPenaltyNorm -
    0.12 * reportPenaltyNorm -
    0.3 * riskPenaltyNorm;

  // Final squashing into [0..1].
  const boundedScore01 = clamp01((Math.tanh(rawLinearScore * 1.35) + 1) / 2);

  return {
    verificationSignal,
    accountAgeNorm,
    communityAffinity,
    contributionVolumeNorm,
    qualityScoreNorm,
    freshnessFactor,
    itemScoreNorm,
    approvalBalance,
    helpfulNorm,
    depthPenaltyNorm,
    reportPenaltyNorm,
    riskPenaltyNorm,
    rawLinearScore,
    boundedScore01,
  };
}

function applyModerationCeiling(score01: number, status: ModerationStatus): number {
  // Hard ceilings to keep moderation and credibility aligned:
  // - Rejected content should never look highly credible.
  // - Pending review remains visible but constrained.
  if (status === "rejected") return Math.min(score01, 0.08);
  if (status === "pending_review") return Math.min(score01, 0.55);
  return score01;
}

function toScore100(score01: number): number {
  return Math.round(clamp(score01, 0, 1) * 100);
}

export function computeThreadCredibility(input: ThreadCredibilityInput): CredibilityResult {
  const status = parseStatus(input.thread.moderationStatus);
  const nowMs = Date.now();
  const breakdown = buildSharedSignals(
    input.author,
    input.thread,
    input.thread.communityId,
    0,
    nowMs
  );
  const final01 = applyModerationCeiling(breakdown.boundedScore01, status);
  return {
    score: toScore100(final01),
    breakdown,
  };
}

export function computeCommentCredibility(input: CommentCredibilityInput): CredibilityResult {
  const status = parseStatus(input.comment.moderationStatus);
  const depth = Array.isArray(input.comment.ancestorIds) ? input.comment.ancestorIds.length : 0;
  const nowMs = Date.now();
  const breakdown = buildSharedSignals(
    input.author,
    input.comment,
    input.threadContext?.communityId,
    depth,
    nowMs
  );
  const final01 = applyModerationCeiling(breakdown.boundedScore01, status);
  return {
    score: toScore100(final01),
    breakdown,
  };
}

