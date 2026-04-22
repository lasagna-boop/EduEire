/** Upper bound for text scanned by moderation (memory / ReDoS guard). */
export const MODERATION_TEXT_MAX_CHARS = 50_000;

export function sanitizeModerationText(
  value: unknown,
  maxChars = MODERATION_TEXT_MAX_CHARS
): string {
  if (typeof value !== "string") return "";
  const stripped = value.replaceAll("\0", "");
  if (stripped.length <= maxChars) return stripped;
  return stripped.slice(0, maxChars);
}
