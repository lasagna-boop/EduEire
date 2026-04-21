const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

function normalizeBase(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS_RE, "")
    .replace(ZERO_WIDTH_RE, "");
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
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  } else {
    out = out.replace(/\s+/g, " ").trim();
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
