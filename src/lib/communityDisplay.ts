export function normalizeCommunityName(communityId: string, name: string): string {
  if (communityId === "tud") return "TU Dublin";
  if (name.trim().toLowerCase() === "tud") return "TU Dublin";
  return name;
}

export function formatCommunityHandle(communityId: string, name?: string | null): string {
  if (communityId === "tud") return "c/TU Dublin";
  if ((name ?? "").trim().toLowerCase() === "tud") return "c/TU Dublin";
  return `c/${communityId}`;
}
