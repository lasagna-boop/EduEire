import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { publicFirebaseStorageDownloadUrl } from "../lib/publicStorageUrl";
import {
  type UniversityExplorerRegion,
  UNIVERSITY_OFFICIAL_SITES,
} from "../lib/universityOfficialSites";

const SIDEBAR_ITEMS: { region: UniversityExplorerRegion | "all"; label: string; icon: string }[] = [
  { region: "all", label: "All Universities", icon: "school" },
  { region: "dublin", label: "Dublin", icon: "location_city" },
  { region: "galway", label: "Galway", icon: "account_balance" },
  { region: "cork", label: "Cork", icon: "foundation" },
  { region: "limerick", label: "Limerick", icon: "hub" },
  { region: "other", label: "More", icon: "map" },
];

export default function UniversityWebsites() {
  const [region, setRegion] = useState<UniversityExplorerRegion | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** Paths that 404 or fail to load — show placeholder (e.g. file not uploaded yet). */
  const [brokenStoragePaths, setBrokenStoragePaths] = useState<ReadonlySet<string>>(() => new Set());

  const markStorageImageBroken = useCallback((storagePath: string) => {
    setBrokenStoragePaths((prev) => {
      if (prev.has(storagePath)) return prev;
      const next = new Set(prev);
      next.add(storagePath);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return UNIVERSITY_OFFICIAL_SITES.filter((u) => {
      if (region !== "all" && u.region !== region) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.shortName.toLowerCase().includes(q) ||
        u.description.toLowerCase().includes(q)
      );
    });
  }, [region, searchQuery]);

  const resetFilters = () => {
    setRegion("all");
    setSearchQuery("");
  };

  return (
    <div className="feed-page university-explorer">
      <AppHeader activeTopLink="communities" />

      <div className="university-explorer__layout">
        <aside className="university-explorer__sidebar" aria-label="Region filters">
          <div className="university-explorer__sidebar-head">
            <h2 className="university-explorer__sidebar-title">EduÉire Explorer</h2>
            <p className="university-explorer__sidebar-sub">Academic directory</p>
          </div>
          <nav className="university-explorer__sidebar-nav">
            {SIDEBAR_ITEMS.map((item) => {
              const active = region === item.region;
              return (
                <button
                  key={item.region}
                  type="button"
                  className={`university-explorer__nav-item ${active ? "university-explorer__nav-item--active" : ""}`}
                  onClick={() => setRegion(item.region)}
                >
                  <span className="material-symbols-outlined university-explorer__nav-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="university-explorer__nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="university-explorer__sidebar-foot">
            <button type="button" className="university-explorer__filter-btn" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        </aside>

        <div className="university-explorer__main-wrap">
          <main className="university-explorer__main">
            <section className="university-explorer__hero">
              <h1 className="university-explorer__hero-title">University Explorer</h1>
              <p className="university-explorer__hero-lead">
                Discover Ireland&apos;s leading academic institutions — open official sites, compare campuses, and
                connect with EduÉire communities.
              </p>
              <label className="university-explorer__search">
                <span className="material-symbols-outlined university-explorer__search-icon" aria-hidden>
                  search
                </span>
                <input
                  type="search"
                  className="university-explorer__search-input"
                  placeholder="Search institutions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
              </label>

              <div className="university-explorer__chips" role="tablist" aria-label="Filter by region">
                {SIDEBAR_ITEMS.map((item) => {
                  const active = region === item.region;
                  return (
                    <button
                      key={`chip-${item.region}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`university-explorer__chip ${active ? "university-explorer__chip--active" : ""}`}
                      onClick={() => setRegion(item.region)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {filtered.length === 0 ? (
              <p className="university-explorer__empty">No universities match your filters.</p>
            ) : (
              <div className="university-explorer__grid">
                {filtered.map((u) => {
                  const fromStorage = publicFirebaseStorageDownloadUrl(u.storagePath);
                  const candidateSrc = u.imageUrl ?? fromStorage;
                  const hideStorageImage =
                    !u.imageUrl && fromStorage != null && brokenStoragePaths.has(u.storagePath);
                  const imageSrc = hideStorageImage ? null : candidateSrc;

                  return (
                  <article key={u.id} className="university-explorer__card">
                    <div className="university-explorer__card-media">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt=""
                          className="university-explorer__card-img"
                          loading="lazy"
                          decoding="async"
                          onError={() => {
                            if (!u.imageUrl && fromStorage) {
                              markStorageImageBroken(u.storagePath);
                            }
                          }}
                        />
                      ) : (
                        <div className="university-explorer__card-placeholder" aria-hidden>
                          <span className="material-symbols-outlined university-explorer__card-placeholder-icon">
                            photo_camera
                          </span>
                          <span className="university-explorer__card-placeholder-text">{u.storagePath}</span>
                        </div>
                      )}
                      {u.badge ? (
                        <div className="university-explorer__card-badges">
                          <span
                            className={
                              u.badge === "popular"
                                ? "university-explorer__badge university-explorer__badge--popular"
                                : "university-explorer__badge university-explorer__badge--new"
                            }
                          >
                            {u.badge === "popular" ? "Popular" : "New threads"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="university-explorer__card-body">
                      <h3 className="university-explorer__card-title">{u.name}</h3>
                      <p className="university-explorer__card-desc">{u.description}</p>
                      <div className="university-explorer__card-actions">
                        <a
                          href={u.officialUrl}
                          className="university-explorer__card-cta"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Official website
                          <span className="material-symbols-outlined university-explorer__card-cta-icon" aria-hidden>
                            arrow_forward
                          </span>
                        </a>
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}

            <footer className="university-explorer__footer">
              <div className="university-explorer__footer-grid">
                <div>
                  <span className="university-explorer__footer-brand">EduÉire</span>
                  <p className="university-explorer__footer-copy">
                    Connecting students and campuses across Ireland. Match{" "}
                    <code className="university-explorer__footer-code">storagePath</code> to files in Storage (public
                    read for <code className="university-explorer__footer-code">universities/</code>) or set{" "}
                    <code className="university-explorer__footer-code">imageUrl</code> for an external URL.
                  </p>
                </div>
                <div>
                  <h4 className="university-explorer__footer-heading">Quick links</h4>
                  <div className="university-explorer__footer-links">
                    <Link to="/feed">Communities feed</Link>
                    <Link to="/map">Study map</Link>
                  </div>
                </div>
              </div>
              <p className="university-explorer__footer-legal">EduÉire — student communities in Ireland</p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
