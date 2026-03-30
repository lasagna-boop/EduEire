import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "../styles/landing.css";
import "../styles/map.css";
import { listMapCommunityPoints, type MapCommunityPoint } from "../lib/mapData";
import SlideMenu from "../components/SlideMenu";
import { useAuth } from "../context/useAuth";
import { logout } from "../lib/auth";

const IRELAND_CENTER: [number, number] = [53.35, -7.65];
const IRELAND_ZOOM = 7;

const ORANGE_PIN_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 22.2 12.5 41 12.5 41S25 22.2 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="#FF9F1C"/>
  <circle cx="12.5" cy="12.5" r="5" fill="#FFFFFF"/>
</svg>
`);

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: `data:image/svg+xml;charset=UTF-8,${ORANGE_PIN_SVG}`,
  iconUrl: `data:image/svg+xml;charset=UTF-8,${ORANGE_PIN_SVG}`,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

function RemoveLeafletPrefix() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl.setPrefix(false);
  }, [map]);

  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const [points, setPoints] = useState<MapCommunityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await listMapCommunityPoints();
        setPoints(data);
      } catch (e) {
        console.error("Failed to load map data", e);
        setError("Could not load map data right now.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const markerCount = useMemo(() => points.length, [points.length]);

  return (
    <div className="map-page">
      <header className="landing__header">
        <div className="landing__header-inner">
          <div className="landing__header-left">
            <SlideMenu />
            <Link to="/" className="landing__logo">
              <img src="/logo.png" alt="EduÉire" className="landing__logo-img" />
            </Link>
            <div className="landing__top-links">
              <Link to="/feed">Communities</Link>
              <Link to="/map" className="map-page__top-link--active">
                Map
              </Link>
            </div>
          </div>

          <div className="map-page__nav-spacer" />

          <div className="landing__auth">
            {user ? (
              <>
                <Link to="/feed" className="landing__btn landing__btn--ghost">
                  My Feed
                </Link>
                <Link to="/profile" className="landing__btn landing__btn--ghost">
                  Profile
                </Link>
                <button onClick={handleLogout} className="landing__btn landing__btn--filled" type="button">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="landing__btn landing__btn--ghost">
                  Log In
                </Link>
                <Link to="/login?mode=signup" className="landing__btn landing__btn--filled">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <header className="map-page__header">
        <div>
          <h1>Resources Map</h1>
          <p>Explore universities and jump into the hottest threads.</p>
        </div>
        <Link className="map-page__back-btn" to="/feed">
          Back to Feed
        </Link>
      </header>

      <section className="map-page__status">
        {loading ? <span>Loading map...</span> : <span>{markerCount} communities on map</span>}
        {error ? <span className="map-page__error">{error}</span> : null}
      </section>

      <MapContainer center={IRELAND_CENTER} zoom={IRELAND_ZOOM} className="map-page__map" scrollWheelZoom>
        <RemoveLeafletPrefix />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup chunkedLoading>
          {points.map((point) => (
            <Marker key={point.communityId} position={[point.lat, point.lng]}>
              <Popup>
                <div className="map-page__popup">
                  <h3>{point.fullName}</h3>
                  <p>{point.city}</p>

                  {point.courseTags.length ? (
                    <div className="map-page__tags" aria-label="Course tags">
                      {point.courseTags.map((tag) => (
                        <span key={`${point.communityId}-${tag}`} className="map-page__tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

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
                      <p>No threads yet for this university.</p>
                    )}
                  </div>

                  <Link className="map-page__community-link" to={`/c/${point.communityId}`}>
                    View community
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
