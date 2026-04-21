/**
 * Firestore `onSnapshot` can emit again before a prior `async` mapping finishes.
 * Without this guard, an older snapshot may resolve last and overwrite state — e.g. a
 * deleted thread can reappear after a newer snapshot already removed it.
 */
export function createSnapshotAsyncGuard() {
  let serial = 0;
  return {
    next: () => ++serial,
    isLatest: (id: number) => id === serial,
  };
}
