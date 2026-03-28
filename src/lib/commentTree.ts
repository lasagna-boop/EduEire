import type { Post } from "./firestore";
import { parseFirestoreDate } from "./firestoreFormat";

function commentMillis(ts: unknown): number {
  try {
    return parseFirestoreDate(ts).getTime();
  } catch {
    return 0;
  }
}

export type CommentTreeNode = Post & { children: CommentTreeNode[] };

/** Build a nested tree from a flat list of posts (same thread subcollection). */
export function buildCommentTree(flat: Post[]): CommentTreeNode[] {
  const map = new Map<string, CommentTreeNode>();
  for (const p of flat) {
    map.set(p.id, { ...p, children: [] });
  }

  const roots: CommentTreeNode[] = [];
  for (const p of flat) {
    const node = map.get(p.id);
    if (!node) continue;
    const pid = p.parentPostId;
    if (pid && map.has(pid)) {
      map.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const byTime = (a: CommentTreeNode, b: CommentTreeNode) =>
    commentMillis(a.createdAt) - commentMillis(b.createdAt);

  function sortRecursive(nodes: CommentTreeNode[]) {
    nodes.sort(byTime);
    for (const n of nodes) sortRecursive(n.children);
  }
  sortRecursive(roots);

  return roots;
}

export function countCommentsInTree(nodes: CommentTreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1 + countCommentsInTree(node.children);
  }
  return n;
}
