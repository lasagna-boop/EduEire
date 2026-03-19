/** Shape passed to `PostCard` (mapped from Firestore threads) */
export type PostCardPost = {
  id: string;
  title: string;
  body: string;
  communityId: string;
  tags: string[];
  author: string;
  createdAt: string;
  score?: number;
  postCount?: number;
  isFlash?: boolean;
};
