import { COMMUNITY_LOCATION_BY_ID } from "./communityLocations";
import { ensureDefaultCommunities, listThreads, type Community, type Thread } from "./firestore";
import { threadVisibleInFeed } from "./firestoreFormat";

export type MapHotThread = {
  id: string;
  title: string;
  score: number;
  tags: string[];
};

export type MapCommunityPoint = {
  communityId: string;
  name: string;
  fullName: string;
  city: string;
  lat: number;
  lng: number;
  hottestThreads: MapHotThread[];
  courseTags: string[];
};

function toMapHotThread(thread: Thread): MapHotThread {
  return {
    id: thread.id,
    title: thread.title,
    score: thread.score ?? 0,
    tags: Array.isArray(thread.tags) ? thread.tags : [],
  };
}

function getCourseTags(threads: Thread[]): string[] {
  const counts = new Map<string, number>();
  for (const thread of threads) {
    const tags = Array.isArray(thread.tags) ? thread.tags : [];
    for (const tag of tags) {
      const normalized = tag.trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([tag]) => tag);
}

function pickHottestThreads(threads: Thread[], limitCount = 3): Thread[] {
  return [...threads]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limitCount);
}

function byCommunityId(threads: Thread[]): Map<string, Thread[]> {
  const grouped = new Map<string, Thread[]>();
  for (const thread of threads) {
    const key = thread.communityId || thread.university;
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(thread);
  }
  return grouped;
}

function toPoint(community: Community, threads: Thread[]): MapCommunityPoint | null {
  const location = COMMUNITY_LOCATION_BY_ID.get(community.id);
  if (!location) return null;

  const hottest = pickHottestThreads(threads);
  return {
    communityId: community.id,
    name: community.name,
    fullName: community.fullName || community.name,
    city: location.city,
    lat: location.lat,
    lng: location.lng,
    hottestThreads: hottest.map(toMapHotThread),
    courseTags: getCourseTags(hottest),
  };
}

export async function listMapCommunityPoints(): Promise<MapCommunityPoint[]> {
  const [communities, threadResult] = await Promise.all([
    ensureDefaultCommunities(),
    listThreads({ pageSize: 200 }),
  ]);
  const now = Date.now();
  const visible = threadResult.threads.filter((thread) => threadVisibleInFeed(thread, now));
  const groupedThreads = byCommunityId(visible);

  return communities
    .map((community) => toPoint(community, groupedThreads.get(community.id) ?? []))
    .filter((point): point is MapCommunityPoint => point !== null);
}
