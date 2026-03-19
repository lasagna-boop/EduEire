import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { CommunitiesSidebar, SECTION_OPTIONS } from "../components/CommunitiesSidebar";
import { CreateThreadCard } from "../components/CreateThreadCard";
import { FeedPageHeader } from "../components/FeedPageHeader";
import {
  getCommunity,
  listThreads,
  listCommunities,
  subscribeToCommunity,
  unsubscribeFromCommunity,
  getUserSubscriptions,
  type Community as CommunityType,
  type Thread,
} from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { threadVisibleInFeed } from "../lib/firestoreFormat";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import { useAuth } from "../context/useAuth";
import { useLogout } from "../hooks/useLogout";
import type { PostCardPost } from "../types/postCard";

function communityJoinButtonLabel(subLoading: boolean, isSubscribed: boolean): string {
  if (subLoading) return "...";
  if (isSubscribed) return "Joined";
  return "Join";
}

export default function Community() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user: fbUser, canWrite, accessMode } = useAuth();
  const handleLogout = useLogout();

  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);

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

  const loadPosts = async () => {
    if (!communityId) return;
    setError(null);
    setLoading(true);
    try {
      const { threads: allThreads } = await listThreads({ communityId, pageSize: 30 });
      const now = Date.now();
      const threads = allThreads.filter((t: Thread) => threadVisibleInFeed(t, now));
      const mapped = await threadsToPostCardPosts(threads, "default");
      setPosts(mapped);
    } catch (e) {
      setError(errorMessage(e) || "failed to load posts");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadCommunity();
    loadCommunities();
    loadPosts();
    checkSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, fbUser?.uid]);

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

  return (
    <div className="feed-page">
      <FeedPageHeader
        search={{
          placeholder: `Search in c/${communityId}`,
          value: searchQuery,
          onChange: setSearchQuery,
        }}
        actions={
          fbUser ? (
            <>
              <Link to="/profile" className="feed-page__user feed-page__user--link">
                {fbUser.displayName || fbUser.email}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="feed-page__btn feed-page__btn--outline"
              >
                Log Out
              </button>
            </>
          ) : null
        }
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
          <div className="community-header">
            <div className="community-header__info">
              <h1 className="community-header__title">c/{communityId}</h1>
              {community && (
                <p className="community-header__fullname">{community.fullName}</p>
              )}
            </div>
            {fbUser && (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={subLoading}
                className={`feed-page__btn ${isSubscribed ? "feed-page__btn--outline" : "feed-page__btn--filled"}`}
              >
                {communityJoinButtonLabel(subLoading, isSubscribed)}
              </button>
            )}
          </div>

          <div className="feed-mobile-sections">
            <button
              type="button"
              className="feed-mobile-sections__toggle"
              onClick={() => setMobileSectionsOpen((v) => !v)}
            >
              <span>Sections</span>
              <span>{mobileSectionsOpen ? "▲" : "▼"}</span>
            </button>
            {mobileSectionsOpen ? (
              <div className="feed-page__sidebar-card">
                <ul className="feed-page__community-list">
                  {SECTION_OPTIONS.map((s, idx) => (
                    <li key={`community-mobile-${s.label}-${idx}`}>
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

          <div className="community-create-thread community-create-thread--mobile">
            <CreateThreadCard
              mode="community"
              fbUser={fbUser}
              canWrite={canWrite}
              accessMode={accessMode}
              fixedCommunityId={communityId ?? ""}
              onPosted={loadPosts}
              onFormError={setError}
              triggerLabel="Create Thread"
              readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
              presentation="overlay"
            />
          </div>

          {error && <p className="feed-page__error">{error}</p>}

          {selectedSection ? (
            <div className="feed-page__sidebar-card" style={{ marginBottom: 16 }}>
              <p>
                Filtering by section: <strong>{selectedSection}</strong>
              </p>
            </div>
          ) : null}

          {loading && filteredPosts.length === 0 ? (
            <div className="feed-page__loading">Loading posts…</div>
          ) : null}
          {!loading && filteredPosts.length === 0 ? (
            <div className="feed-page__empty">
              No posts in c/{communityId} yet. Be the first to post!
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
          <div className="feed-page__sidebar-card">
            <h3>About c/{communityId}</h3>
            {community ? (
              <>
                <p>{community.description || community.fullName}</p>
                <div className="community-stats">
                  <span className="community-stats__item">
                    <strong>{community.memberCount}</strong> members
                  </span>
                </div>
              </>
            ) : (
              <p>Loading...</p>
            )}
          </div>
          <div className="community-create-thread community-create-thread--desktop">
            <CreateThreadCard
              mode="community"
              fbUser={fbUser}
              canWrite={canWrite}
              accessMode={accessMode}
              fixedCommunityId={communityId ?? ""}
              onPosted={loadPosts}
              onFormError={setError}
              triggerLabel="Create Thread"
              readOnlyMessage="Read-only accounts can create threads only in Admissions or First Year/Transition."
              presentation="overlay"
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
