import { collection, getDocs, query, where } from "firebase/firestore";
import { COMMUNITY_LOCATION_BY_ID } from "./communityLocations";
import { db } from "./firebase";
import {
  ensureDefaultCommunities,
  listThreads,
  type Community,
  type Thread,
} from "./firestore";
import { threadVisibleInFeed } from "./firestoreFormat";

export type MapHotThread = {
  id: string;
  title: string;
  score: number;
  tags: string[];
};

/** One marker on /map (Firestore `map_points` or legacy fallback). */
export type MapPointForUi = {
  id: string;
  name: string;
  category: string;
  communityId: string;
  lat: number;
  lng: number;
  city: string;
  /** Set when linked to a community (for subtitle + threads). */
  communityFullName: string;
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

function toLegacyPoint(community: Community, threads: Thread[]): MapPointForUi | null {
  const location = COMMUNITY_LOCATION_BY_ID.get(community.id);
  if (!location) return null;

  const hottest = pickHottestThreads(threads);
  return {
    id: `legacy_${community.id}`,
    name: community.fullName || community.name,
    category: "university_campus",
    communityId: community.id,
    lat: location.lat,
    lng: location.lng,
    city: location.city,
    communityFullName: community.fullName || community.name,
    hottestThreads: hottest.map(toMapHotThread),
    courseTags: getCourseTags(hottest),
  };
}

async function listMapPointsLegacy(): Promise<MapPointForUi[]> {
  const [communities, threadResult] = await Promise.all([
    ensureDefaultCommunities(),
    listThreads({ pageSize: 200 }),
  ]);
  const now = Date.now();
  const visible = threadResult.threads.filter((thread) => threadVisibleInFeed(thread, now));
  const groupedThreads = byCommunityId(visible);

  return communities
    .map((community) => toLegacyPoint(community, groupedThreads.get(community.id) ?? []))
    .filter((point): point is MapPointForUi => point !== null);
}

/**
 * Loads map markers: primary source Firestore `map_points` (hasCoordinates == true).
 * If that collection is empty, falls back to one marker per seeded community (legacy).
 */
export async function listMapPointsForMap(): Promise<MapPointForUi[]> {
  const q = query(collection(db, "map_points"), where("hasCoordinates", "==", true));
  const snap = await getDocs(q);

  const [communities, threadResult] = await Promise.all([
    ensureDefaultCommunities(),
    listThreads({ pageSize: 200 }),
  ]);
  const now = Date.now();
  const visible = threadResult.threads.filter((thread) => threadVisibleInFeed(thread, now));
  const groupedThreads = byCommunityId(visible);
  const commById = new Map(communities.map((c) => [c.id, c]));

  if (snap.empty) {
    return listMapPointsLegacy();
  }

  const points: MapPointForUi[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    // Must match query + guard against bad data (manual edits / old merges).
    if (data.hasCoordinates !== true) continue;

    const lat = data.latitude as number | undefined;
    const lng = data.longitude as number | undefined;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      continue;
    }

    const communityId = typeof data.communityId === "string" ? data.communityId.trim() : "";
    const comm = communityId ? commById.get(communityId) : undefined;
    const threadsForComm = communityId ? groupedThreads.get(communityId) ?? [] : [];
    const hottest = pickHottestThreads(threadsForComm);

    points.push({
      id: d.id,
      name: (data.name as string) || d.id,
      category: (data.category as string) || "other",
      communityId,
      lat,
      lng,
      city: (data.city as string) || "",
      communityFullName: comm ? comm.fullName || comm.name : "",
      hottestThreads: hottest.map(toMapHotThread),
      courseTags: getCourseTags(hottest),
    });
  }

  return points.sort((a, b) => a.name.localeCompare(b.name));
}

