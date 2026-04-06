/**
 * Direct media URL for objects in Firebase Storage when rules allow unauthenticated read
 * (e.g. `universities/**` in storage.rules). Avoids a round-trip per file via getDownloadURL.
 */
export function publicFirebaseStorageDownloadUrl(storagePath: string): string | null {
  const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
  const path = storagePath.trim();
  if (!bucket || !path) return null;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}
