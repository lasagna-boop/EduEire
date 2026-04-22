export const READ_ONLY_ALLOWED_SECTIONS = [
  "Admissions",
  "First Year/Transition",
] as const;

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function hasReadOnlyAllowedTag(tags?: string[]): boolean {
  if (!Array.isArray(tags) || tags.length === 0) return false;
  const normalizedAllowed = new Set(READ_ONLY_ALLOWED_SECTIONS.map(normalizeTag));
  return tags.some((tag) => normalizedAllowed.has(normalizeTag(tag)));
}

