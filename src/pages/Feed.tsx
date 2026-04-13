import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { CommunitiesSidebar, SECTION_OPTIONS } from "../components/CommunitiesSidebar";
import { CreateThreadCard } from "../components/CreateThreadCard";
import AppHeader from "../components/AppHeader";
import {
  listThreads,
  ensureDefaultCommunities,
  isAdmin,
  type Community,
  type Thread,
} from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { threadVisibleInFeed } from "../lib/firestoreFormat";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import { useAuth } from "../context/useAuth";
import type { PostCardPost } from "../types/postCard";

type FeedSort = "recent" | "mostLiked" | "credibility";

export default function Feed() {
  const { user: fbUser, canWrite, accessMode } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";

  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(qFromUrl);
  const [selectedSection, setSelectedSection] = useState("");
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);
  const [feedSort, setFeedSort] = useState<FeedSort>("recent");
  const [streamScrolled, setStreamScrolled] = useState(false);

  const [adminUser, setAdminUser] = useState(false);
  const [communityId, setCommunityId] = useState("");

  const loadCommunities = async () => {
    try {
      const list = await ensureDefaultCommunities();
      setCommunities(list);
      if (list.length > 0 && !communityId) {
        setCommunityId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load/seed communities:", e);
    }
  };

  const load = async (sortMode: FeedSort = feedSort) => {
    setError(null);
    setLoading(true);
    try {
      const sortBy =
        sortMode === "recent"
          ? "createdAt"
          : sortMode === "mostLiked"
            ? "score"
            : "credibilityScore";
      const { threads: allThreads } = await listThreads({ pageSize: 30, sortBy });
      const now = Date.now();
      const threads = allThreads.filter((t: Thread) => threadVisibleInFeed(t, now));
      const mapped = await threadsToPostCardPosts(threads, "feed");
      setPosts(mapped);
    } catch (e) {
      setError(errorMessage(e) || "failed to load threads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunities();
    load();
    if (fbUser) isAdmin(fbUser.uid).then(setAdminUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchQuery(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setStreamScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const trimmed = value.trim();
        if (trimmed) next.set("q", trimmed);
        else next.delete("q");
        return next;
      },
      { replace: true }
    );
  };

  const filteredPosts = posts.filter((p) => {
    const searchMatches =
      searchQuery.length === 0 ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.body.toLowerCase().includes(searchQuery.toLowerCase());
    if (!searchMatches) return false;

    if (!selectedSection) return true;
    return p.tags.some((t) => t.toLowerCase() === selectedSection.toLowerCase());
  });
  const visibleCount = filteredPosts.length;

  return (
    <div
      className={[
        "feed-page",
        "feed-page--stream",
        streamScrolled ? "feed-page--stream-scrolled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AppHeader
        activeTopLink="communities"
        search={{
          placeholder: "Search posts",
          value: searchQuery,
          onChange: handleSearchQueryChange,
        }}
      />

      <main className="feed-page__main">
        <CommunitiesSidebar
          communities={communities}
          activeSection={selectedSection}
          onSectionSelect={(section) =>
            setSelectedSection((prev) => (prev === section ? "" : section))
          }
        />

        <div className="feed-page__content">
          <header className="feed-stream__intro">
            <div className="feed-stream__intro-head">
              <h1 className="feed-stream__title">Feed</h1>
              <div className="feed-stream__intro-badges" aria-label="Feed overview">
                <span className="feed-stream__badge">
                  {visibleCount} {visibleCount === 1 ? "post" : "posts"}
                </span>
                {selectedSection ? (
                  <span className="feed-stream__badge feed-stream__badge--soft">
                    #{selectedSection}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="feed-stream__subtitle">
              Community updates across EduÉire, curated by topic and ranked your way.
            </p>
          </header>

          <div className="feed-mobile-sections">
            <button
              type="button"
              className="feed-mobile-sections__toggle"
              onClick={() => setMobileSectionsOpen((v) => !v)}
              aria-expanded={mobileSectionsOpen}
            >
              <span>Browse topics</span>
              <span aria-hidden>{mobileSectionsOpen ? "▲" : "▼"}</span>
            </button>
            {mobileSectionsOpen ? (
              <div className="feed-page__sidebar-card">
                <ul className="feed-page__community-list">
                  {SECTION_OPTIONS.map((s, idx) => (
                    <li key={`mobile-${s.label}-${idx}`}>
                      <button
                        type="button"
                        className={[
                          "feed-page__community-link",
                          selectedSection === s.label ? "feed-page__community-link--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          setSelectedSection((prev) => (prev === s.label ? "" : s.label))
                        }
                      >
                        <span className="feed-page__community-icon">{s.icon}</span>
                        <span className="feed-page__community-name">{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="feed-create-thread feed-create-thread--mobile">
            <CreateThreadCard
              mode="feed"
              fbUser={fbUser}
              canWrite={canWrite}
              accessMode={accessMode}
              communities={communities}
              communityId={communityId}
              onCommunityIdChange={setCommunityId}
              onPosted={load}
              onFormError={setError}
              triggerLabel="Create Post"
              readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
              presentation="overlay"
            />
          </div>

          {error ? <p className="feed-page__error">{error}</p> : null}

          <div className="feed-stream__toolbar">
            <div
              className="feed-sort-switch feed-sort-switch--stream"
              role="group"
              aria-label="Sort feed"
            >
              <button
                type="button"
                className={[
                  "feed-sort-switch__btn",
                  feedSort === "recent" ? "feed-sort-switch__btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setFeedSort("recent");
                  void load("recent");
                }}
              >
                Recent
              </button>
              <button
                type="button"
                className={[
                  "feed-sort-switch__btn",
                  feedSort === "mostLiked" ? "feed-sort-switch__btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setFeedSort("mostLiked");
                  void load("mostLiked");
                }}
              >
                Popular
              </button>
              <button
                type="button"
                className={[
                  "feed-sort-switch__btn",
                  feedSort === "credibility" ? "feed-sort-switch__btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setFeedSort("credibility");
                  void load("credibility");
                }}
              >
                <span className="feed-sort-switch__btn-inner">
                  Credibility
                  <span className="feed-sort-switch__beta">beta</span>
                </span>
              </button>
            </div>

            {selectedSection ? (
              <button
                type="button"
                className="feed-stream__filter-chip"
                onClick={() => setSelectedSection("")}
                aria-label={`Clear topic filter: ${selectedSection}`}
              >
                <span className="feed-stream__filter-prefix">Topic</span>
                <span className="feed-stream__filter-value">{selectedSection}</span>
                <span className="feed-stream__filter-dismiss" aria-hidden>
                  ×
                </span>
              </button>
            ) : null}
          </div>

          {loading && filteredPosts.length === 0 ? (
            <div className="feed-stream__loading" role="status" aria-live="polite">
              Loading posts…
            </div>
          ) : null}
          {!loading && filteredPosts.length === 0 ? (
            <div className="feed-stream__empty">
              {searchQuery.trim() || selectedSection ? (
                <>
                  Nothing matches your filters.
                  <strong>Try another search or clear the topic filter.</strong>
                </>
              ) : (
                <>
                  No posts yet.
                  <strong>Start a thread and help the community grow.</strong>
                </>
              )}
            </div>
          ) : null}
          {filteredPosts.length > 0 ? (
            <div className="feed-page__list">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="feed-page__right-sidebar">
          <div className="feed-page__sidebar-card feed-stream__about-card">
            <h3>About EduÉire</h3>
            <p>
              Ireland&apos;s community for students and educators to connect, share, and learn
              together.
            </p>
            {adminUser ? (
              <Link to="/admin" className="feed-page__btn feed-page__btn--outline feed-stream__admin-link">
                Admin
              </Link>
            ) : null}
          </div>
          <div className="feed-create-thread feed-create-thread--desktop">
            <CreateThreadCard
              mode="feed"
              fbUser={fbUser}
              canWrite={canWrite}
              accessMode={accessMode}
              communities={communities}
              communityId={communityId}
              onCommunityIdChange={setCommunityId}
              onPosted={load}
              onFormError={setError}
              triggerLabel="Create Post"
              readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
              presentation="overlay"
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
