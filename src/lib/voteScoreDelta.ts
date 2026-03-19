/** Reddit-style score delta when changing vote from current to next. */
export function voteScoreDelta(
  currentVote: "up" | "down" | null,
  newVote: "up" | "down" | null
): number {
  if (currentVote === null && newVote === "up") return 1;
  if (currentVote === null && newVote === "down") return -1;
  if (currentVote === "up" && newVote === null) return -1;
  if (currentVote === "up" && newVote === "down") return -2;
  if (currentVote === "down" && newVote === null) return 1;
  if (currentVote === "down" && newVote === "up") return 2;
  return 0;
}
