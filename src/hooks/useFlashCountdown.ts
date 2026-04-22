import { useEffect, useState } from "react";
import type { Thread } from "../lib/firestore";
import { parseFirestoreDate } from "../lib/firestoreFormat";

/** Firestore Timestamp, Date, millis, or ISO string passed into countdown hooks. */
type ExpiryInput = unknown | null | undefined;

function formatRemaining(diffMs: number): string {
  if (diffMs <= 0) return "Expired";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Live countdown for any Firestore-style expiry (thread flash, profile flash status, etc.).
 */
export function useExpiryCountdown(expiresAt: ExpiryInput): string | null {
  const [now, setNow] = useState(() => Date.now());
  const active = expiresAt != null;

  useEffect(() => {
    if (!active) return;
    const id = globalThis.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => globalThis.clearInterval(id);
  }, [active, expiresAt]);

  if (!active) return null;
  const expiresMs = parseFirestoreDate(expiresAt).getTime();
  return formatRemaining(expiresMs - now);
}

/**
 * Live countdown label for flash threads, or null if not a flash thread.
 * Uses a ticking clock updated from an interval (no synchronous setState in effects).
 */
export function useFlashCountdown(thread: Thread | null): string | null {
  const expiresAt = thread?.flashExpiresAt;
  const countdown = useExpiryCountdown(expiresAt);
  if (!thread || expiresAt == null) return null;
  return countdown;
}
