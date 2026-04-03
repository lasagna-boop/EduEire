import { describe, expect, it } from "vitest";
import type { Post } from "../../src/lib/firestore";
import { buildCommentTree, countCommentsInTree } from "../../src/lib/commentTree";

const ts = (iso: string) => iso;

function post(p: Partial<Post> & Pick<Post, "id">): Post {
  return {
    body: "",
    authorId: "u1",
    authorName: "a",
    ...p,
  };
}

describe("buildCommentTree", () => {
  it("nests replies under parents and sorts by time", () => {
    const flat: Post[] = [
      post({ id: "root", createdAt: ts("2025-01-01T12:00:00.000Z") }),
      post({
        id: "c1",
        parentPostId: "root",
        createdAt: ts("2025-01-01T12:05:00.000Z"),
      }),
      post({
        id: "c0",
        parentPostId: "root",
        createdAt: ts("2025-01-01T12:01:00.000Z"),
      }),
    ];

    const roots = buildCommentTree(flat);
    expect(roots).toHaveLength(1);
    expect(roots[0]!.id).toBe("root");
    expect(roots[0]!.children.map((c) => c.id)).toEqual(["c0", "c1"]);
  });

  it("treats missing parent as root-level", () => {
    const flat: Post[] = [
      post({ id: "a", createdAt: ts("2025-01-01T12:00:00.000Z") }),
      post({
        id: "orphan",
        parentPostId: "missing",
        createdAt: ts("2025-01-01T12:01:00.000Z"),
      }),
    ];
    const roots = buildCommentTree(flat);
    expect(roots.map((r) => r.id).sort()).toEqual(["a", "orphan"]);
  });
});

describe("countCommentsInTree", () => {
  it("counts nodes recursively", () => {
    const flat: Post[] = [
      post({ id: "r", createdAt: ts("2025-01-01T12:00:00.000Z") }),
      post({
        id: "c1",
        parentPostId: "r",
        createdAt: ts("2025-01-01T12:01:00.000Z"),
      }),
    ];
    const roots = buildCommentTree(flat);
    expect(countCommentsInTree(roots)).toBe(2);
  });
});
