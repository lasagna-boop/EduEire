/**
 * Callable: returns aggregate landing stats using Admin SDK (guests can't count `users` in Firestore).
 * Also mirrors into `public_stats/landing` so repeat visits can read Firestore only.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 30;

async function enforceRateLimit(uid: string): Promise<void> {
  const ref = db.doc(`_rate_limits/getLandingStats_${uid}`);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? snap.data() : {};
    const windowStartMs =
      typeof prev?.windowStartMs === "number" ? (prev.windowStartMs as number) : now;
    const requestCount =
      typeof prev?.requestCount === "number" ? (prev.requestCount as number) : 0;

    if (now - windowStartMs < RATE_LIMIT_WINDOW_MS) {
      if (requestCount >= RATE_LIMIT_MAX_CALLS) {
        throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please retry shortly.");
      }
      tx.set(
        ref,
        {
          windowStartMs,
          requestCount: requestCount + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    tx.set(
      ref,
      {
        windowStartMs: now,
        requestCount: 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export const getLandingStats = onCall(
  {
    cors: false,
    invoker: "private",
    enforceAppCheck: true,
    region: "us-central1",
    maxInstances: 20,
    timeoutSeconds: 10,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    await enforceRateLimit(request.auth.uid);

    const snap = await db.doc("public_stats/landing").get();
    const data = snap.data() ?? {};

    const registeredUsersCount =
      typeof data.registeredUsersCount === "number" ? data.registeredUsersCount : 0;
    const verifiedStudentsCount =
      typeof data.verifiedStudentsCount === "number" ? data.verifiedStudentsCount : 0;
    const discussionsCount = typeof data.discussionsCount === "number" ? data.discussionsCount : 0;

    return {
      registeredUsersCount,
      verifiedStudentsCount,
      discussionsCount,
    };
  }
);
