/**
 * Writes aggregate counts to `public_stats/landing` so the marketing page can show
 * real numbers to signed-out visitors (the `users` collection is not world-readable).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

async function sync(): Promise<void> {
  const usersCol = db.collection("users");
  const threadsCol = db.collection("threads");

  const [registeredSnap, verifiedSnap, threadsSnap] = await Promise.all([
    usersCol.count().get(),
    usersCol.where("studentEmailConfirmed", "==", true).count().get(),
    threadsCol.count().get(),
  ]);

  await db.doc("public_stats/landing").set(
    {
      registeredUsersCount: registeredSnap.data().count,
      verifiedStudentsCount: verifiedSnap.data().count,
      discussionsCount: threadsSnap.data().count,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** Runs shortly after deploy and on a fixed cadence so stats stay fresh. */
export const syncPublicLandingStats = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "Europe/Dublin",
    retryCount: 2,
  },
  async () => {
    await sync();
  }
);
