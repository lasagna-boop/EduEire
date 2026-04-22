import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "../styles/map.css";
import { listMapPointsForMap, type MapPointForUi } from "../lib/mapData";
import AppHeader from "../components/AppHeader";

const IRELAND_CENTER: [number, number] = [53.35, -7.65];
const IRELAND_ZOOM = 7;
const CATEGORY_ORDER = ["university_campus", "public_library", "student_hub", "study_zone"] as const;

type MapCategory = (typeof CATEGORY_ORDER)[number];

const CATEGORY_META: Record<MapCategory, { label: string; icon: string }> = {
  university_campus: { label: "Campuses", icon: "🎓" },
  public_library: { label: "Libraries", icon: "📚" },
  student_hub: { label: "Study Hubs", icon: "🏫" },
  study_zone: { label: "Study Zones", icon: "🧠" },
};

/** Pin fill colours — must match `.map-page__legend-item--*` in map.css */
const CATEGORY_PIN_FILL: Record<MapCategory, string> = {
  university_campus: "#ff9f1c",
  public_library: "#2d6a4f",
  student_hub: "#2563eb",
  study_zone: "#7c3aed",
};

function encodePinSvg(fill: string): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 22.2 12.5 41 12.5 41S25 22.2 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="${fill}"/>
  <circle cx="12.5" cy="12.5" r="5" fill="#FFFFFF"/>
</svg>`;
  return encodeURIComponent(svg.trim());
}

function makeLeafletPinIcon(fill: string): L.Icon {
  const encoded = encodePinSvg(fill);
  return L.icon({
    iconRetinaUrl: `data:image/svg+xml;charset=UTF-8,${encoded}`,
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encoded}`,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const MARKER_ICON_BY_CATEGORY: Record<MapCategory, L.Icon> = {
  university_campus: makeLeafletPinIcon(CATEGORY_PIN_FILL.university_campus),
  public_library: makeLeafletPinIcon(CATEGORY_PIN_FILL.public_library),
  student_hub: makeLeafletPinIcon(CATEGORY_PIN_FILL.student_hub),
  study_zone: makeLeafletPinIcon(CATEGORY_PIN_FILL.study_zone),
};

function markerIconForCategory(category: string): L.Icon {
  if (CATEGORY_ORDER.includes(category as MapCategory)) {
    return MARKER_ICON_BY_CATEGORY[category as MapCategory];
  }
  return MARKER_ICON_BY_CATEGORY.university_campus;
}

function RemoveLeafletPrefix() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl.setPrefix(false);
  }, [map]);

  return null;
}

function MapZoomControls() {
  const map = useMap();

  return (
    <div className="map-page__map-ui">
      <div className="map-page__zoom-controls" role="group" aria-label="Map zoom">
        <button type="button" className="map-page__zoom-btn" onClick={() => map.zoomIn()} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="map-page__zoom-btn" onClick={() => map.zoomOut()} aria-label="Zoom out">
          −
        </button>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [points, setPoints] = useState<MapPointForUi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** `null` = show all categories; otherwise only that category. */
  const [activeCategoryOnly, setActiveCategoryOnly] = useState<MapCategory | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await listMapPointsForMap();
        setPoints(data);
      } catch (e) {
        console.error("Failed to load map data", e);
        setError("Could not load map data right now.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredPoints = useMemo(() => {
    if (activeCategoryOnly === null) {
      return points;
    }
    return points.filter((point) => (point.category as MapCategory) === activeCategoryOnly);
  }, [points, activeCategoryOnly]);

  const visibleCount = filteredPoints.length;
  const totalPoints = points.length;
  const categoryCounts = useMemo(() => {
    const counts = new Map<MapCategory, number>();
    for (const category of CATEGORY_ORDER) counts.set(category, 0);
    for (const point of points) {
      if (CATEGORY_ORDER.includes(point.category as MapCategory)) {
        const key = point.category as MapCategory;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [points]);

  const selectCategory = (category: MapCategory) => {
    setActiveCategoryOnly((prev) => (prev === category ? null : category));
  };

  return (
    <div className="map-page">
      <AppHeader activeTopLink="map" />

      <section className="map-page__canvas">
        <aside className="map-page__sidebar">
          <div className="map-page__sidebar-inner">
            <div className="map-page__sidebar-head">
              <h2>Study Map</h2>
              <p>Find a spot fast and jump straight into the community thread.</p>
              <div className="map-page__sidebar-badges" aria-label="Map summary">
                <span className="map-page__sidebar-badge">
                  {visibleCount} {visibleCount === 1 ? "location" : "locations"}
                </span>
                {activeCategoryOnly ? (
                  <span className="map-page__sidebar-badge map-page__sidebar-badge--soft">
                    {CATEGORY_META[activeCategoryOnly].label}
                  </span>
                ) : null}
              </div>
            </div>

            <nav className="map-page__category-list" aria-label="Map categories">
              {CATEGORY_ORDER.map((category) => {
                const selected = activeCategoryOnly === category;
                return (
                  <button
                    key={category}
                    type="button"
                    className={`map-page__category-btn ${selected ? "map-page__category-btn--active" : ""}`}
                    aria-pressed={selected}
                    onClick={() => selectCategory(category)}
                  >
                    <span className="map-page__category-icon" aria-hidden>
                      {CATEGORY_META[category].icon}
                    </span>
                    <span>{CATEGORY_META[category].label}</span>
                    <span className="map-page__category-count">{categoryCounts.get(category) ?? 0}</span>
                  </button>
                );
              })}
            </nav>

            <Link className="map-page__back-btn map-page__back-btn--sidebar" to="/feed">
              Back to Feed
            </Link>
          </div>

          <div className="map-page__sidebar-foot">
            {loading ? (
              <span>Loading map...</span>
            ) : totalPoints === 0 ? (
              <span>No locations loaded</span>
            ) : (
              <span>
                Showing {visibleCount} of {totalPoints} locations
              </span>
            )}
            <span className="map-page__sidebar-foot-note">Tap any pin to open hottest threads.</span>
            {error ? <span className="map-page__error">{error}</span> : null}
          </div>
        </aside>

        <MapContainer
          center={IRELAND_CENTER}
          zoom={IRELAND_ZOOM}
          className="map-page__map"
          scrollWheelZoom
          zoomControl={false}
        >
          <RemoveLeafletPrefix />
          <MapZoomControls />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MarkerClusterGroup chunkedLoading>
            {filteredPoints.map((point) => (
            <Marker key={point.id} position={[point.lat, point.lng]} icon={markerIconForCategory(point.category)}>
              <Popup>
                <div className="map-page__popup">
                  <p className="map-page__category">{point.category.replace(/_/g, " ")}</p>
                  <h3>{point.name}</h3>
                  {point.communityId && point.communityFullName ? (
                    <p className="map-page__community-line">{point.communityFullName}</p>
                  ) : null}
                  <p>{point.city}</p>

                  {point.communityId && point.courseTags.length ? (
                    <div className="map-page__tags" aria-label="Course tags">
                      {point.courseTags.map((tag) => (
                        <span key={`${point.id}-${tag}`} className="map-page__tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {point.communityId ? (
                    <div className="map-page__threads">
                      <h4>Hottest threads</h4>
                      {point.hottestThreads.length ? (
                        <ul>
                          {point.hottestThreads.map((thread) => (
                            <li key={thread.id}>
                              <Link to={`/thread/${thread.id}`}>{thread.title}</Link>
                              <span>score {thread.score}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No threads yet for this community.</p>
                      )}
                    </div>
                  ) : (
                    <p className="map-page__threads-note">Discussion threads are linked to university communities.</p>
                  )}

                  {point.communityId ? (
                    <Link className="map-page__community-link" to={`/c/${point.communityId}`}>
                      View community
                    </Link>
                  ) : null}
                </div>
              </Popup>
            </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        <div className="map-page__legend" aria-label="Map legend">
          <span className="map-page__legend-item--university">
            <i /> Campus
          </span>
          <span className="map-page__legend-item--library">
            <i /> Library
          </span>
          <span className="map-page__legend-item--hub">
            <i /> Study Hub
          </span>
          <span className="map-page__legend-item--zone">
            <i /> Study Zone
          </span>
        </div>
      </section>
    </div>
  );
}
