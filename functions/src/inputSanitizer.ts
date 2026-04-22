const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

/** Same coverage as legacy regex: drop C0 except HT/LF/CR, and DEL. */
function stripDisallowedControls(value: string): string {
  return [...value]
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      if (cp <= 8) return false;
      if (cp === 11 || cp === 12) return false;
      if (cp >= 14 && cp <= 31) return false;
      return cp !== 127;
    })
    .join("");
}

function normalizeBase(value: string): string {
  return stripDisallowedControls(value.normalize("NFKC").replaceAll(/\r\n?/g, "\n")).replaceAll(
    ZERO_WIDTH_RE,
    ""
  );
}

export function sanitizeUserText(
  value: unknown,
  opts?: {
    maxChars?: number;
    preserveNewlines?: boolean;
  }
): string {
  if (typeof value !== "string") return "";
  const maxChars = opts?.maxChars ?? 12_000;
  const preserveNewlines = opts?.preserveNewlines ?? true;

  let out = normalizeBase(value);
  if (preserveNewlines) {
    out = out
      .replaceAll(/[ \t]+\n/g, "\n")
      .replaceAll(/\n{4,}/g, "\n\n\n")
      .trim();
  } else {
    out = out.replaceAll(/\s+/g, " ").trim();
  }

  if (out.length > maxChars) {
    out = out.slice(0, maxChars);
  }
  return out;
}

export function sanitizeUserLine(value: unknown, maxChars: number): string {
  return sanitizeUserText(value, { maxChars, preserveNewlines: false });
}

export function sanitizeUserEmail(value: unknown, maxChars = 120): string {
  return sanitizeUserLine(value, maxChars).toLowerCase();
}

export function sanitizeStringArray(
  value: unknown,
  opts?: {
    maxItems?: number;
    maxItemChars?: number;
  }
): string[] {
  if (!Array.isArray(value)) return [];
  const maxItems = opts?.maxItems ?? 20;
  const maxItemChars = opts?.maxItemChars ?? 64;
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    if (out.length >= maxItems) break;
    const item = sanitizeUserLine(raw, maxItemChars);
    if (!item) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}
