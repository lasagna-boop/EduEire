import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import {
  CommunitiesSidebar,
  SECTION_OPTIONS,
  SectionTopicList,
} from "../components/CommunitiesSidebar";
import { CreateThreadCard } from "../components/CreateThreadCard";
import AppHeader from "../components/AppHeader";
import {
  ensureDefaultCommunities,
  isAdmin,
  subscribeThreads,
  type Community,
  type Thread,
} from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { threadVisibleInFeed } from "../lib/firestoreFormat";
import { createSnapshotAsyncGuard } from "../lib/snapshotAsyncGuard";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import { useAuth } from "../context/useAuth";
import type { PostCardPost } from "../types/postCard";

type FeedSort = "recent" | "mostLiked" | "credibility";

export default function Feed() {
  const { user: fbUser, canWrite, accessMode } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const communityFromUrl = searchParams.get("community")?.trim() ?? "";
  const sortFromUrl = searchParams.get("sort")?.trim().toLowerCase() ?? "";
  const topicFromUrl = searchParams.get("topic")?.trim() ?? "";

  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(qFromUrl);
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);
  const [streamScrolled, setStreamScrolled] = useState(false);

  const feedSort: FeedSort = useMemo(() => {
    if (sortFromUrl === "popular") return "mostLiked";
    if (sortFromUrl === "credibility") return "credibility";
    return "recent";
  }, [sortFromUrl]);

  const selectedSection = useMemo(() => {
    if (!topicFromUrl) return "";
    return SECTION_OPTIONS.some((o) => o.label === topicFromUrl) ? topicFromUrl : "";
  }, [topicFromUrl]);

  const [adminUser, setAdminUser] = useState(false);
  const [communityId, setCommunityId] = useState("");

  /** Empty = all institutions; otherwise Firestore filter by `communityId`. */
  const feedCommunityScope = useMemo(() => {
    if (!communityFromUrl) return "";
    if (communities.length === 0) return communityFromUrl;
    return communities.some((c) => c.id === communityFromUrl) ? communityFromUrl : "";
  }, [communityFromUrl, communities]);

  const activeCommunityMeta = useMemo(
    () => communities.find((c) => c.id === feedCommunityScope) ?? null,
    [communities, feedCommunityScope]
  );

  const loadCommunities = useCallback(async () => {
    try {
      const list = await ensureDefaultCommunities();
      setCommunities(list);
      if (list.length > 0 && !communityId) {
        setCommunityId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load/seed communities:", e);
    }
  }, [communityId]);

  useEffect(() => {
    void loadCommunities();
  }, [loadCommunities]);

  useEffect(() => {
    if (fbUser?.uid) isAdmin(fbUser.uid).then(setAdminUser);
    else setAdminUser(false);
  }, [fbUser]);

  useEffect(() => {
    setError(null);
    setLoading(true);
    const sortBy =
      feedSort === "recent"
        ? "createdAt"
        : feedSort === "mostLiked"
          ? "score"
          : "credibilityScore";
    const guard = createSnapshotAsyncGuard();
    const unsubscribe = subscribeThreads(
      {
        pageSize: 30,
        sortBy,
        communityId: feedCommunityScope || undefined,
      },
      async (allThreads) => {
        const snapId = guard.next();
        try {
          const now = Date.now();
          const threads = allThreads.filter((t: Thread) => threadVisibleInFeed(t, now));
          const mapped = await threadsToPostCardPosts(threads, "feed");
          if (!guard.isLatest(snapId)) return;
          setPosts(mapped);
          setError(null);
        } catch (e) {
          if (!guard.isLatest(snapId)) return;
          setError(errorMessage(e) || "failed to load threads");
        } finally {
          if (guard.isLatest(snapId)) setLoading(false);
        }
      },
      (e) => {
        setError(errorMessage(e) || "failed to load threads");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [feedSort, feedCommunityScope]);

  useEffect(() => {
    if (communities.length === 0 || !communityFromUrl) return;
    if (!communities.some((c) => c.id === communityFromUrl)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("community");
          return next;
        },
        { replace: true }
      );
    }
  }, [communities, communityFromUrl, setSearchParams]);

  useEffect(() => {
    if (!topicFromUrl) return;
    if (!SECTION_OPTIONS.some((o) => o.label === topicFromUrl)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("topic");
          return next;
        },
        { replace: true }
      );
    }
  }, [topicFromUrl, setSearchParams]);

  useEffect(() => {
    if (feedCommunityScope && communities.some((c) => c.id === feedCommunityScope)) {
      setCommunityId(feedCommunityScope);
    }
  }, [feedCommunityScope, communities]);

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

  const handleFeedScopeChange = (nextId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextId) next.set("community", nextId);
        else next.delete("community");
        return next;
      },
      { replace: true }
    );
  };

  const handleSortChange = (mode: FeedSort) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (mode === "recent") next.delete("sort");
        else if (mode === "mostLiked") next.set("sort", "popular");
        else next.set("sort", "credibility");
        return next;
      },
      { replace: true }
    );
  };

  const handleTopicToggle = (label: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const current = next.get("topic");
        if (current === label) next.delete("topic");
        else next.set("topic", label);
        return next;
      },
      { replace: true }
    );
  };

  const clearTopicFilter = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("topic");
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
          onSectionSelect={(section) => handleTopicToggle(section)}
        />

        <div className="feed-page__content">
          <header className="feed-stream__intro">
            <div className="feed-stream__intro-head">
              <h1 className="feed-stream__title">Feed</h1>
              <div className="feed-stream__intro-badges" aria-label="Feed overview">
                <span className="feed-stream__badge">
                  {visibleCount} {visibleCount === 1 ? "post" : "posts"}
                </span>
                {feedCommunityScope && activeCommunityMeta ? (
                  <span className="feed-stream__badge feed-stream__badge--soft">
                    {activeCommunityMeta.name}
                  </span>
                ) : null}
                {selectedSection ? (
                  <span className="feed-stream__badge feed-stream__badge--soft">
                    #{selectedSection}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="feed-stream__subtitle">
              {feedCommunityScope && activeCommunityMeta ? (
                <>
                  Showing threads from{" "}
                  <strong>{activeCommunityMeta.fullName}</strong> only. Switch to{" "}
                  <em>All institutions</em> to browse across EduÉire, or open a full community page
                  for subscribe and local context.
                </>
              ) : (
                <>
                  <strong>Mixed feed:</strong> posts from every institution, with{" "}
                  <span className="feed-stream__subtitle-mono">c/…</span> on each card. Use the
                  institution control below to match a single-university view, or stay on{" "}
                  <em>All institutions</em>
                  {communities[0] ? (
                    <>
                      {" "}
                      — open{" "}
                      <Link
                        to={`/c/${communities[0].id}`}
                        className="feed-stream__subtitle-link"
                      >
                        a community hub
                      </Link>{" "}
                      for subscriptions and local context.
                    </>
                  ) : (
                    "."
                  )}
                </>
              )}
            </p>
          </header>

          <div className="feed-mobile-sections">
            <button
              type="button"
              className={[
                "feed-mobile-sections__toggle",
                mobileSectionsOpen ? "feed-mobile-sections__toggle--open" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setMobileSectionsOpen((v) => !v)}
              aria-expanded={mobileSectionsOpen}
            >
              <span className="feed-mobile-sections__toggle-label">Browse topics</span>
              <span className="feed-mobile-sections__caret" aria-hidden>
                ▼
              </span>
            </button>
            {mobileSectionsOpen ? (
              <div className="feed-page__sidebar-card feed-page__sections-card feed-page__sections-card--sheet">
                <div className="feed-page__sections-head">
                  <h3 className="feed-page__sections-title">Sections</h3>
                  <p className="feed-page__sections-lede">Tap a tag to filter the feed</p>
                </div>
                <SectionTopicList
                  activeSection={selectedSection}
                  onSectionSelect={(label) => handleTopicToggle(label)}
                  instanceKey="feed-mobile"
                />
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
              onPosted={async () => {}}
              onFormError={setError}
              triggerLabel="Create Post"
              readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
              presentation="overlay"
              overlayTitle="New post"
              overlayDescription="Pick an institution, add a tag, then publish to the feed."
            />
          </div>

          {error ? <p className="feed-page__error">{error}</p> : null}

          <div className="feed-stream__toolbar">
            <div className="feed-stream__scope">
              <label className="feed-stream__scope-label" htmlFor="feed-institution-scope">
                Institution
              </label>
              <select
                id="feed-institution-scope"
                className="feed-stream__scope-select"
                value={feedCommunityScope}
                onChange={(e) => handleFeedScopeChange(e.target.value)}
                aria-label="Filter feed by institution"
              >
                <option value="">All institutions</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.fullName}
                  </option>
                ))}
              </select>
            </div>

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
                onClick={() => handleSortChange("recent")}
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
                onClick={() => handleSortChange("mostLiked")}
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
                onClick={() => handleSortChange("credibility")}
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
                onClick={() => clearTopicFilter()}
                aria-label={`Clear topic filter: ${selectedSection}`}
              >
                <span className="feed-stream__filter-prefix">Topic</span>
                <span className="feed-stream__filter-value">{selectedSection}</span>
                <span className="feed-stream__filter-dismiss" aria-hidden>
                  ×
                </span>
              </button>
            ) : null}

            {feedCommunityScope ? (
              <button
                type="button"
                className="feed-stream__filter-chip feed-stream__filter-chip--soft"
                onClick={() => handleFeedScopeChange("")}
                aria-label={`Clear institution filter: ${activeCommunityMeta?.name ?? feedCommunityScope}`}
              >
                <span className="feed-stream__filter-prefix">Institution</span>
                <span className="feed-stream__filter-value">
                  {activeCommunityMeta?.name ?? feedCommunityScope}
                </span>
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
              {searchQuery.trim() || selectedSection || feedCommunityScope ? (
                <>
                  Nothing matches your filters.
                  <strong>
                    Try another search, clear the topic filter
                    {feedCommunityScope ? ", or show all institutions" : ""}.
                  </strong>
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
          <div className="feed-page__sidebar-card feed-stream__about-card feed-page__rail-card">
            <div className="feed-page__rail-head">
              <h3 className="feed-page__rail-title">About EduÉire</h3>
            </div>
            <div className="feed-page__rail-body">
              <p className="feed-page__rail-copy">
                Ireland&apos;s community for students and educators to connect, share, and learn
                together.
              </p>
              {adminUser ? (
                <Link
                  to="/admin"
                  className="feed-page__btn feed-page__btn--outline feed-stream__admin-link feed-page__rail-admin"
                >
                  Admin
                </Link>
              ) : null}
            </div>
          </div>
          {fbUser ? (
            <div className="feed-page__sidebar-card feed-page__rail-card feed-page__rail-card--cta feed-create-thread feed-create-thread--desktop">
              <div className="feed-page__rail-head feed-page__rail-head--tight">
                <h3 className="feed-page__rail-title">New post</h3>
                <p className="feed-page__rail-lede">
                  Opens the composer; your post appears on the feed after you publish.
                </p>
              </div>
              <div className="feed-page__rail-cta-slot">
                <CreateThreadCard
                  mode="feed"
                  fbUser={fbUser}
                  canWrite={canWrite}
                  accessMode={accessMode}
                  communities={communities}
                  communityId={communityId}
                  onCommunityIdChange={setCommunityId}
                  onPosted={async () => {}}
                  onFormError={setError}
                  triggerLabel="Create Post"
                  readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
                  presentation="overlay"
                  overlayTitle="New post"
                  overlayDescription="Pick an institution, add a tag, then publish to the feed."
                />
              </div>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
