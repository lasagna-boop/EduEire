import { useCallback, useMemo, useState } from "react";
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
  const activeRegionLabel =
    SIDEBAR_ITEMS.find((item) => item.region === region)?.label ?? "All Universities";

  const resetFilters = () => {
    setRegion("all");
    setSearchQuery("");
  };

  return (
    <div className="feed-page">
      <AppHeader
        activeTopLink="communities"
        search={{
          placeholder: "Search institutions…",
          value: searchQuery,
          onChange: setSearchQuery,
        }}
      />

      <main className="feed-page__main">
        <aside className="feed-page__left-sidebar" aria-label="Region filters">
          <div className="universities-page__sidebar-card">
            <div className="universities-page__sidebar-head">
              <h2 className="universities-page__sidebar-title">Explorer</h2>
              <p className="universities-page__sidebar-sub">Filter by region</p>
            </div>
            <nav className="universities-page__nav">
              {SIDEBAR_ITEMS.map((item) => {
                const active = region === item.region;
                return (
                  <button
                    key={item.region}
                    type="button"
                    className={`universities-page__nav-item ${active ? "universities-page__nav-item--active" : ""}`}
                    onClick={() => setRegion(item.region)}
                  >
                    <span className="material-symbols-outlined universities-page__nav-icon" aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              className="feed-page__btn feed-page__btn--filled universities-page__reset-btn"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
        </aside>

        <div className="feed-page__content universities-page">
          <div className="flairs-page__header universities-page__hero">
            <div className="universities-page__hero-head">
              <h1 className="flairs-page__title">University Explorer</h1>
              <div className="universities-page__hero-badges" aria-label="Explorer summary">
                <span className="universities-page__hero-badge">
                  {filtered.length} {filtered.length === 1 ? "result" : "results"}
                </span>
                <span className="universities-page__hero-badge universities-page__hero-badge--soft">
                  {activeRegionLabel}
                </span>
              </div>
            </div>
            <p className="flairs-page__subtitle">
              Find official university sites, scan campus vibes, and jump from exploration into
              community threads.
            </p>
          </div>

          <div className="universities-page__chips" role="tablist" aria-label="Filter by region">
            {SIDEBAR_ITEMS.map((item) => {
              const active = region === item.region;
              return (
                <button
                  key={`chip-${item.region}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`universities-page__chip ${active ? "universities-page__chip--active" : ""}`}
                  onClick={() => setRegion(item.region)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="feed-page__empty universities-page__empty">No universities match your filters.</p>
          ) : (
            <div className="universities-page__grid">
              {filtered.map((u) => {
                const fromStorage = publicFirebaseStorageDownloadUrl(u.storagePath);
                const candidateSrc = u.imageUrl ?? fromStorage;
                const hideStorageImage =
                  !u.imageUrl && fromStorage != null && brokenStoragePaths.has(u.storagePath);
                const imageSrc = hideStorageImage ? null : candidateSrc;

                return (
                  <article key={u.id} className="universities-page__card">
                    <div className="universities-page__card-media">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt=""
                          className="universities-page__card-img"
                          loading="lazy"
                          decoding="async"
                          onError={() => {
                            if (!u.imageUrl && fromStorage) {
                              markStorageImageBroken(u.storagePath);
                            }
                          }}
                        />
                      ) : (
                        <div className="universities-page__card-placeholder" aria-hidden>
                          <span className="material-symbols-outlined universities-page__card-placeholder-icon">
                            photo_camera
                          </span>
                          <span className="universities-page__card-placeholder-text">{u.storagePath}</span>
                        </div>
                      )}
                      {u.badge ? (
                        <div className="universities-page__card-badges">
                          <span
                            className={
                              u.badge === "popular"
                                ? "universities-page__badge universities-page__badge--popular"
                                : "universities-page__badge universities-page__badge--new"
                            }
                          >
                            {u.badge === "popular" ? "Popular" : "New threads"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="universities-page__card-body">
                      <h3 className="universities-page__card-title">{u.name}</h3>
                      <p className="universities-page__card-desc">{u.description}</p>
                      <a
                        href={u.officialUrl}
                        className="feed-page__btn feed-page__btn--filled universities-page__card-cta"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Official website
                        <span className="material-symbols-outlined universities-page__card-cta-icon" aria-hidden>
                          arrow_forward
                        </span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
