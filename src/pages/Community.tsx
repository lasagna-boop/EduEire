import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { CommunitiesSidebar, SectionTopicList } from "../components/CommunitiesSidebar";
import { CreateThreadCard } from "../components/CreateThreadCard";
import AppHeader from "../components/AppHeader";
import { UserProfileLink } from "../components/UserProfileLink";
import {
  getCommunity,
  listCommunities,
  subscribeToCommunity,
  unsubscribeFromCommunity,
  getUserSubscriptions,
  listCommunityTopSubscribers,
  subscribeThreads,
  type CommunityActiveSubscriber,
  type Community as CommunityType,
  type Thread,
} from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { threadVisibleInFeed } from "../lib/firestoreFormat";
import { createSnapshotAsyncGuard } from "../lib/snapshotAsyncGuard";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import { formatCommunityHandle } from "../lib/communityDisplay";
import { useAuth } from "../context/useAuth";
import type { PostCardPost } from "../types/postCard";

function communityJoinButtonLabel(subLoading: boolean, isSubscribed: boolean): string {
  if (subLoading) return "...";
  if (isSubscribed) return "Joined";
  return "Join";
}

export default function Community() {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const { user: fbUser, canWrite, accessMode } = useAuth();

  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(qFromUrl);
  const [selectedSection, setSelectedSection] = useState("");
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);
  const [topSubscribers, setTopSubscribers] = useState<CommunityActiveSubscriber[]>([]);
  const [topSubscribersLoading, setTopSubscribersLoading] = useState(false);
  const communityHandle = formatCommunityHandle(communityId ?? "", community?.name);

  const loadCommunity = async () => {
    if (!communityId) return;
    try {
      const c = await getCommunity(communityId);
      setCommunity(c);
    } catch (e) {
      console.error("Failed to load community", e);
    }
  };

  const loadCommunities = async () => {
    try {
      const list = await listCommunities();
      setCommunities(list);
    } catch (e) {
      console.error("Failed to load communities", e);
    }
  };

  const checkSubscription = async () => {
    if (!fbUser || !communityId) return;
    try {
      const subs = await getUserSubscriptions(fbUser.uid);
      setIsSubscribed(subs.includes(communityId));
    } catch (e) {
      console.error("Failed to check subscription", e);
    }
  };

  const loadTopSubscribers = async () => {
    if (!communityId) return;
    setTopSubscribersLoading(true);
    try {
      const ranked = await listCommunityTopSubscribers(communityId, 3);
      setTopSubscribers(ranked);
    } catch (e) {
      console.error("Failed to load top subscribers", e);
      setTopSubscribers([]);
    } finally {
      setTopSubscribersLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity();
    loadCommunities();
    checkSubscription();
    loadTopSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, fbUser?.uid]);

  useEffect(() => {
    if (!communityId) return;
    setError(null);
    setLoading(true);
    const guard = createSnapshotAsyncGuard();
    const unsubscribe = subscribeThreads(
      { communityId, pageSize: 30, sortBy: "lastActivity" },
      async (allThreads) => {
        const snapId = guard.next();
        try {
          const now = Date.now();
          const threads = allThreads.filter((t: Thread) => threadVisibleInFeed(t, now));
          const mapped = await threadsToPostCardPosts(threads, "default");
          if (!guard.isLatest(snapId)) return;
          setPosts(mapped);
          setError(null);
        } catch (e) {
          if (!guard.isLatest(snapId)) return;
          setError(errorMessage(e) || "failed to load posts");
        } finally {
          if (guard.isLatest(snapId)) setLoading(false);
        }
      },
      (e) => {
        setError(errorMessage(e) || "failed to load posts");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [communityId]);

  useEffect(() => {
    setSearchQuery(qFromUrl);
  }, [qFromUrl]);

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

  const handleSubscribe = async () => {
    if (!fbUser || !communityId) return;
    setSubLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromCommunity(fbUser.uid, communityId);
        setIsSubscribed(false);
      } else {
        await subscribeToCommunity(fbUser.uid, communityId);
        setIsSubscribed(true);
      }
      await loadCommunity();
    } catch (e) {
      console.error("Failed to update subscription", e);
    } finally {
      setSubLoading(false);
    }
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
    <div className="feed-page feed-page--stream">
      <AppHeader
        activeTopLink="communities"
        search={{
          placeholder: `Search in ${communityHandle}`,
          value: searchQuery,
          onChange: handleSearchQueryChange,
          onSubmit: () => {
            if (!communityId) return;
            const path = `/c/${communityId}`;
            const q = searchQuery.trim();
            navigate(q ? `${path}?q=${encodeURIComponent(q)}` : path, { replace: true });
          },
        }}
      />

      <main className="feed-page__main">
        <CommunitiesSidebar
          communities={communities}
          activeCommunityId={communityId}
          activeSection={selectedSection}
          onSectionSelect={(section) =>
            setSelectedSection((prev) => (prev === section ? "" : section))
          }
        />

        <div className="feed-page__content">
          <header className="feed-stream__intro feed-stream__intro--community">
            <div className="feed-stream__intro-head">
              <div>
                <h1 className="feed-stream__title">{communityHandle}</h1>
                <p className="feed-stream__subtitle">
                  {community?.fullName ??
                    `University community feed for ${communityHandle}.`}{" "}
                  {communityId ? (
                    <Link
                      to={`/feed?community=${encodeURIComponent(communityId)}`}
                      className="feed-stream__subtitle-link"
                    >
                      Same scope on the home feed
                    </Link>
                  ) : null}
                </p>
              </div>
              <div className="feed-stream__intro-badges" aria-label="Community overview">
                <span className="feed-stream__badge">
                  {visibleCount} {visibleCount === 1 ? "post" : "posts"}
                </span>
                {community ? (
                  <span className="feed-stream__badge feed-stream__badge--soft">
                    {community.memberCount} {community.memberCount === 1 ? "member" : "members"}
                  </span>
                ) : null}
              </div>
            </div>
            {fbUser ? (
              <div className="feed-stream__community-actions">
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={subLoading}
                  className={`feed-page__btn ${isSubscribed ? "feed-page__btn--outline" : "feed-page__btn--filled"}`}
                >
                  {communityJoinButtonLabel(subLoading, isSubscribed)}
                </button>
              </div>
            ) : null}
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
                  <p className="feed-page__sections-lede">Tap a tag to filter posts</p>
                </div>
                <SectionTopicList
                  activeSection={selectedSection}
                  onSectionSelect={(label) =>
                    setSelectedSection((prev) => (prev === label ? "" : label))
                  }
                  instanceKey="community-mobile"
                />
              </div>
            ) : null}
          </div>

          <div className="community-create-thread community-create-thread--mobile">
            <CreateThreadCard
              mode="community"
              fbUser={fbUser}
              canWrite={canWrite}
              accessMode={accessMode}
              fixedCommunityId={communityId ?? ""}
              onPosted={async () => {}}
              onFormError={setError}
              triggerLabel="Create Thread"
              readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
              presentation="overlay"
              overlayTitle="New thread"
              overlayDescription="Add a title, choose tags, and post to this community."
            />
          </div>

          {error ? <p className="feed-page__error">{error}</p> : null}

          <div className="feed-stream__toolbar">
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
                  No posts in {communityHandle} yet.
                  <strong>Be the first to start a thread.</strong>
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
              <h3 className="feed-page__rail-title">About {communityHandle}</h3>
            </div>
            <div className="feed-page__rail-body">
            {community ? (
              <>
                <p className="feed-page__rail-copy">{community.description || community.fullName}</p>
                <div className="feed-stream__active-box" aria-label="Top active subscribers">
                  <p className="feed-stream__active-title">Top active subscribers</p>
                  {topSubscribersLoading ? (
                    <p className="feed-stream__active-empty">Loading active subscribers...</p>
                  ) : topSubscribers.length > 0 ? (
                    <ul className="feed-stream__active-list">
                      {topSubscribers.map((subscriber, idx) => (
                        <li key={subscriber.id}>
                          <span className="feed-stream__active-rank">#{idx + 1}</span>
                          <UserProfileLink
                            profileKey={subscriber.profileKey}
                            label={subscriber.name}
                            className="feed-stream__active-name"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="feed-stream__active-empty">No active subscribers yet.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="feed-page__rail-copy">Loading...</p>
            )}
            </div>
          </div>
          {fbUser ? (
            <div className="feed-page__sidebar-card feed-page__rail-card feed-page__rail-card--cta community-create-thread community-create-thread--desktop">
              <div className="feed-page__rail-head feed-page__rail-head--tight">
                <h3 className="feed-page__rail-title">New thread</h3>
                <p className="feed-page__rail-lede">Opens the composer for this community.</p>
              </div>
              <div className="feed-page__rail-cta-slot">
                <CreateThreadCard
                  mode="community"
                  fbUser={fbUser}
                  canWrite={canWrite}
                  accessMode={accessMode}
                  fixedCommunityId={communityId ?? ""}
                  onPosted={async () => {}}
                  onFormError={setError}
                  triggerLabel="Create Thread"
                  readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
                  presentation="overlay"
                  overlayTitle="New thread"
                  overlayDescription="Add a title, choose tags, and post to this community."
                />
              </div>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
