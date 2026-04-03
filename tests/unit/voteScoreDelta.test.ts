import { describe, expect, it } from "vitest";
import { voteScoreDelta } from "../../src/lib/voteScoreDelta";

describe("voteScoreDelta", () => {
  it("returns +1 when voting up from neutral", () => {
    expect(voteScoreDelta(null, "up")).toBe(1);
  });

  it("returns -1 when removing an upvote", () => {
    expect(voteScoreDelta("up", null)).toBe(-1);
  });

  it("returns -2 when switching from up to down", () => {
    expect(voteScoreDelta("up", "down")).toBe(-2);
  });

  it("returns +2 when switching from down to up", () => {
    expect(voteScoreDelta("down", "up")).toBe(2);
  });

  it("returns 0 when vote state does not change", () => {
    expect(voteScoreDelta(null, null)).toBe(0);
    expect(voteScoreDelta("up", "up")).toBe(0);
    expect(voteScoreDelta("down", "down")).toBe(0);
  });
});
