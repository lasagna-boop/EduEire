const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

/** Default only when GeoJSON has no Point; must be Grangegorman for `tud`, not legacy Aungier Street. */
const COMMUNITY_COORDINATE_FALLBACK = {
  tud: { lat: 53.3562487, lng: -6.2821949 },
  trinity: { lat: 53.3438, lng: -6.2546 },
  ucd: { lat: 53.3077, lng: -6.2229 },
  ucc: { lat: 51.8922, lng: -8.4923 },
  galway: { lat: 53.277, lng: -9.0615 },
  ul: { lat: 52.6739, lng: -8.571 },
  dcu: { lat: 53.385, lng: -6.2573 },
  maynooth: { lat: 53.3813, lng: -6.592 },
  rcsi: { lat: 53.3384, lng: -6.2657 },
  nci: { lat: 53.348, lng: -6.2436 },
};

function readProjectId(repoRoot) {
  const rcPath = path.join(repoRoot, ".firebaserc");
  const raw = fs.readFileSync(rcPath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed?.projects?.default || null;
}

function toFirestoreDoc(feature) {
  const properties = feature?.properties || {};
  const geometry = feature?.geometry || null;
  const coords = Array.isArray(geometry?.coordinates) ? geometry.coordinates : null;

  const hasCoordinates =
    geometry?.type === "Point" &&
    Array.isArray(coords) &&
    coords.length >= 2 &&
    Number.isFinite(coords[0]) &&
    Number.isFinite(coords[1]);

  const longitude = hasCoordinates ? Number(coords[0]) : null;
  const latitude = hasCoordinates ? Number(coords[1]) : null;

  return {
    id: String(properties.id || "").trim(),
    data: {
      address: properties.address ?? "",
      category: properties.category ?? "other",
      city: properties.city ?? "",
      communityId: properties.communityId ?? null,
      confidenceScore:
        typeof properties.confidence_score === "number" ? properties.confidence_score : null,
      county: properties.county ?? "",
      eircode: properties.eircode ?? null,
      hasCoordinates,
      importedAt: Timestamp.now(),
      lastVerifiedDate: properties.last_verified_date ?? null,
      latitude,
      longitude,
      name: properties.name ?? "",
      notes: properties.notes ?? "",
      sourceType: properties.source_type ?? "",
      sourceUrl: properties.source_url ?? "",
    },
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const inputPath = path.join(repoRoot, "ireland_student_map_dataset.geojson");
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || readProjectId(repoRoot);

  if (!projectId) {
    throw new Error("Project ID not found. Set GOOGLE_CLOUD_PROJECT or check .firebaserc");
  }

  initializeApp({ projectId });
  const db = getFirestore();

  const raw = fs.readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const features = Array.isArray(parsed?.features) ? parsed.features : [];

  if (!features.length) {
    throw new Error("No features found in ireland_student_map_dataset.geojson");
  }

  let batch = db.batch();
  let inBatch = 0;
  let processed = 0;

  for (const feature of features) {
    const { id, data } = toFirestoreDoc(feature);
    if (!id) continue;

    const ref = db.collection("map_points").doc(id);
    const existingSnap = await ref.get();
    const existing = existingSnap.exists ? existingSnap.data() : null;

    if (data.hasCoordinates !== true) {
      const existingLat = existing?.latitude;
      const existingLng = existing?.longitude;
      if (
        typeof existingLat === "number" &&
        typeof existingLng === "number" &&
        Number.isFinite(existingLat) &&
        Number.isFinite(existingLng)
      ) {
        data.latitude = existingLat;
        data.longitude = existingLng;
        data.hasCoordinates = true;
      } else if (
        typeof data.communityId === "string" &&
        COMMUNITY_COORDINATE_FALLBACK[data.communityId]
      ) {
        const fallback = COMMUNITY_COORDINATE_FALLBACK[data.communityId];
        data.latitude = fallback.lat;
        data.longitude = fallback.lng;
        data.hasCoordinates = true;
      }
    }

    batch.set(ref, data, { merge: true });
    inBatch += 1;
    processed += 1;

    if (inBatch === 400) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }

  if (inBatch > 0) {
    await batch.commit();
  }

  console.log(`Synced ${processed} map points to map_points in project ${projectId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
