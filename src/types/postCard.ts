/** Shape passed to `PostCard` (mapped from Firestore threads) */
export type PostCardPost = {
  id: string;
  title: string;
  body: string;
  communityId: string;
  tags: string[];
  authorId: string;
  /** For /u/:handle links; falls back to uid for older posts */
  authorProfileKey: string;
  author: string;
  createdAt: string;
  score?: number;
  postCount?: number;
  isFlash?: boolean;
  /** Thread posted with anonymous author (display only; real name for admins) */
  isAnonymous?: boolean;
  /** Admin-only: Cloud Function credibility 0–100 */
  credibilityScore?: number;
  credibilityModelVersion?: string;
};
