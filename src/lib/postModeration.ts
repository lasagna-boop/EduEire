import type { Post } from "./firestore";

export function isApprovedPost(p: Post): boolean {
  return !p.moderationStatus || p.moderationStatus === "approved";
}
