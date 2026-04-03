import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CREDIBILITY_MODEL_VERSION,
  computeThreadCredibility,
  serializeThreadCredibilityInput,
} from "../../functions/src/credibility";

describe("credibility model (Cloud Functions)", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2025-06-01T12:00:00.000Z").getTime()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the active model version constant", () => {
    expect(CREDIBILITY_MODEL_VERSION).toBe("v1");
  });

  it("produces scores in 0..100 for a typical thread input", () => {
    const result = computeThreadCredibility({
      author: {
        studentEmailConfirmed: true,
        accessMode: "full",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        subscriptions: ["tud"],
        approvedPostsCount: 2,
        approvedCommentsCount: 5,
        rejectedContentCount: 0,
        cumulativeThreadScore: 10,
        cumulativeCommentScore: 4,
        helpfulMarksCount: 1,
        totalThreadsCount: 3,
        totalCommentsCount: 10,
        lastContributionAt: new Date("2025-05-30T00:00:00.000Z"),
        reportsAgainstCount: 0,
        confirmedReportsCount: 0,
      },
      thread: {
        communityId: "tud",
        score: 5,
        moderationStatus: "approved",
        toxicityScore: 0,
        spamScore: 0,
        createdAt: new Date("2025-06-01T10:00:00.000Z"),
      },
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown.boundedScore01).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.boundedScore01).toBeLessThanOrEqual(1);
  });

  it("caps credibility strongly for rejected threads", () => {
    const result = computeThreadCredibility({
      author: {
        studentEmailConfirmed: true,
        accessMode: "full",
        approvedPostsCount: 50,
        approvedCommentsCount: 50,
        rejectedContentCount: 0,
        cumulativeThreadScore: 100,
        cumulativeCommentScore: 100,
        helpfulMarksCount: 20,
        totalThreadsCount: 20,
        totalCommentsCount: 50,
        reportsAgainstCount: 0,
        confirmedReportsCount: 0,
      },
      thread: {
        communityId: "tud",
        score: 100,
        moderationStatus: "rejected",
        toxicityScore: 0,
        spamScore: 0,
      },
    });

    expect(result.score).toBeLessThanOrEqual(10);
  });

  it("serialises thread inputs for storage with model version", () => {
    const doc = serializeThreadCredibilityInput("user-1", "thread-1", {
      author: {
        studentEmailConfirmed: true,
        accessMode: "full",
        subscriptions: ["tud"],
      },
      thread: {
        communityId: "tud",
        moderationStatus: "approved",
        score: 1,
      },
    });

    expect(doc.modelVersion).toBe(CREDIBILITY_MODEL_VERSION);
    expect(doc.kind).toBe("thread");
    expect(doc.threadId).toBe("thread-1");
    expect(doc.authorId).toBe("user-1");
  });
});
