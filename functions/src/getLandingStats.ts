/**
 * Callable: returns aggregate landing stats using Admin SDK (guests can't count `users` in Firestore).
 * Also mirrors into `public_stats/landing` so repeat visits can read Firestore only.
 */
import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const getLandingStats = onCall(
  {
    cors: false,
    invoker: "private",
    enforceAppCheck: true,
    region: "us-central1",
  },
  async () => {
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
