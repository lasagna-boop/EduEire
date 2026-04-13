import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Thread } from "../../src/lib/firestore";
import { useExpiryCountdown, useFlashCountdown } from "../../src/hooks/useFlashCountdown";

describe("useFlashCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when thread is null", () => {
    const { result } = renderHook(() => useFlashCountdown(null));
    expect(result.current).toBeNull();
  });

  it("returns null when there is no flash expiry", () => {
    const thread: Thread = {
      id: "t1",
      title: "x",
      body: "",
      communityId: "tud",
      tags: [],
      authorId: "u",
      authorName: "a",
    };
    const { result } = renderHook(() => useFlashCountdown(thread));
    expect(result.current).toBeNull();
  });

  it("shows Expired after flash time passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00.000Z"));

    const thread: Thread = {
      id: "t2",
      title: "flash",
      body: "",
      communityId: "tud",
      tags: [],
      authorId: "u",
      authorName: "a",
      flashExpiresAt: "2025-06-01T11:00:00.000Z",
    };

    const { result } = renderHook(() => useFlashCountdown(thread));
    expect(result.current).toBe("Expired");
    vi.useRealTimers();
  });
});

describe("useExpiryCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when expiry is missing", () => {
    const { result } = renderHook(() => useExpiryCountdown(undefined));
    expect(result.current).toBeNull();
  });

  it("shows Expired after expiry time passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00.000Z"));

    const { result } = renderHook(() =>
      useExpiryCountdown("2025-06-01T11:00:00.000Z"),
    );
    expect(result.current).toBe("Expired");
    vi.useRealTimers();
  });
});
