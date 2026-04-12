import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Feed from "../../src/pages/Feed";
import { AuthContext, type AuthCtx } from "../../src/context/auth-context";

vi.mock("../../src/lib/firestore", () => ({
  listThreads: vi.fn().mockResolvedValue({ threads: [] }),
  ensureDefaultCommunities: vi.fn().mockResolvedValue([]),
  listCommunities: vi.fn().mockResolvedValue([]),
  isAdmin: vi.fn().mockResolvedValue(false),
  countPosts: vi.fn().mockResolvedValue(0),
}));

function renderFeedAt(path: string) {
  const value: AuthCtx = {
    user: { uid: "u1" } as AuthCtx["user"],
    loading: false,
    accessMode: "full",
    studentEmailConfirmed: true,
    canWrite: true,
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Feed />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Feed URL search query", () => {
  it("initializes the header search from ?q=", async () => {
    renderFeedAt("/feed?q=biology");

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search posts")).toHaveValue("biology");
    });
  });
});
