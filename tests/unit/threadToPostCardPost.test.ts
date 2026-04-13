import { describe, expect, it } from "vitest";
import type { Thread } from "../../src/lib/firestore";
import { threadToPostCardPost } from "../../src/lib/threadPostMap";

function thread(partial: Partial<Thread> & Pick<Thread, "id" | "title">): Thread {
  return {
    body: "",
    communityId: "tud",
    tags: [],
    authorId: "u1",
    authorName: "Author",
    ...partial,
  };
}

describe("threadToPostCardPost", () => {
  it("maps feed source to communityId with university fallback", () => {
    const t = thread({
      id: "t1",
      title: "Hello",
      communityId: undefined,
      university: "galway",
    });
    const card = threadToPostCardPost(t, 3, "feed");
    expect(card.communityId).toBe("galway");
    expect(card.postCount).toBe(3);
    expect(card.author).toBe("Author");
    expect(card.authorId).toBe("u1");
    expect(card.authorProfileKey).toBe("u1");
  });

  it("uses communityId only when not in feed mode", () => {
    const t = thread({
      id: "t2",
      title: "Hi",
      communityId: "ucd",
      university: "ignored",
    });
    const card = threadToPostCardPost(t, 0, "default");
    expect(card.communityId).toBe("ucd");
  });

  it("uses authorPublicHandle for profile URL key when set", () => {
    const t = thread({
      id: "t3",
      title: "Hi",
      authorPublicHandle: "jane_doe",
    });
    const card = threadToPostCardPost(t, 0, "default");
    expect(card.authorProfileKey).toBe("jane_doe");
  });
});
