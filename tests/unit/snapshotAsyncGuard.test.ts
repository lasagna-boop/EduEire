import { describe, expect, it, vi } from "vitest";
import { createSnapshotAsyncGuard } from "../../src/lib/snapshotAsyncGuard";

describe("createSnapshotAsyncGuard", () => {
  it("drops stale async completions when a newer snapshot started", async () => {
    const guard = createSnapshotAsyncGuard();
    const apply = vi.fn();

    const a = guard.next();
    const b = guard.next();

    await Promise.resolve();
    if (guard.isLatest(a)) apply("first");
    if (guard.isLatest(b)) apply("second");

    expect(apply.mock.calls).toEqual([["second"]]);
  });
});
