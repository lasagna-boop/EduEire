import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import SlideMenu from "../components/SlideMenu";
import {
  getCommunity,
  listThreads,
  listCommunities,
  createThread,
  subscribeToCommunity,
  unsubscribeFromCommunity,
  getUserSubscriptions,
  countPosts,
  type Community as CommunityType,
  type Thread,
} from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { formatFirestoreDay, threadVisibleInFeed } from "../lib/firestoreFormat";
import { useAuth } from "../context/useAuth";
import { logout } from "../lib/auth";
import { moderateContent } from "../lib/moderation";

type PostCardPost = {
  id: string;
  title: string;
  body: string;
  communityId: string;
  tags: string[];
  author: string;
  createdAt: string;
  score?: number;
  postCount?: number;
  isFlash?: boolean;
};

export default function Community() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user: fbUser, canWrite } = useAuth();

  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [flashDuration, setFlashDuration] = useState<"" | "1" | "3" | "24">("");

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

      const counts = await Promise.all(threads.map((t) => countPosts(t.id)));

      const mapped: PostCardPost[] = threads.map((t: Thread, i: number) => ({
        id: t.id,
        title: t.title,
        body: t.body ?? "",
        communityId: t.communityId ?? "",
        tags: Array.isArray(t.tags) ? t.tags : [],
        author: t.authorName || "anon",
        createdAt: formatFirestoreDay(t.createdAt),
        score: t.score ?? 0,
        postCount: counts[i],
        isFlash: !!t.flashExpiresAt,
      }));

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
    // Functions close over latest communityId / fbUser via deps
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser || !communityId || !canWrite) return;

    setBusy(true);
    setError(null);

    const modResult = moderateContent(title.trim(), body.trim());
    if (modResult.flagged) {
      setError(`Your post contains inappropriate language and cannot be published.`);
      setBusy(false);
      return;
    }

    try {
      const tagList = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let flashExpiresAt: Date | null = null;
      if (flashDuration) {
        const hours = Number(flashDuration);
        flashExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      }

      await createThread({
        title: title.trim(),
        body: body.trim(),
        communityId,
        tags: tagList,
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
        flashExpiresAt,
      });

      setTitle("");
      setBody("");
      setTags("");
      setFlashDuration("");
      setShowNew(false);

      await loadPosts();
    } catch (e) {
      setError(errorMessage(e) || "failed to create post");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const filteredPosts = searchQuery
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  return (
    <div className="feed-page">
      {/* Header */}
      <header className="feed-page__header">
        <SlideMenu />
        <Link to="/" className="feed-page__logo">
          <img src="/logo.png" alt="EduÉire" className="feed-page__logo-img" />
        </Link>

        <form className="feed-page__search" onSubmit={(e) => e.preventDefault()}>
          <span className="feed-page__search-icon">🔍</span>
          <input
            type="text"
            placeholder={`Search in c/${communityId}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="feed-page__search-input"
          />
        </form>

        <div className="feed-page__actions">
          {fbUser && (
            <>
              <Link to="/profile" className="feed-page__user feed-page__user--link">
                {fbUser.displayName || fbUser.email}
              </Link>
              <button onClick={handleLogout} className="feed-page__btn feed-page__btn--outline">
                Log Out
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="feed-page__main">
        {/* Left Sidebar - Communities */}
        <aside className="feed-page__left-sidebar">
          <div className="feed-page__sidebar-card">
            <h3>Communities</h3>
            <ul className="feed-page__community-list">
              {communities.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/c/${c.id}`}
                    className={`feed-page__community-link ${c.id === communityId ? "feed-page__community-link--active" : ""}`}
                  >
                    <span className="feed-page__community-icon">🎓</span>
                    <span className="feed-page__community-name">c/{c.id}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Center - Posts */}
        <div className="feed-page__content">
          {/* Community Header */}
          <div className="community-header">
            <div className="community-header__info">
              <h1 className="community-header__title">c/{communityId}</h1>
              {community && (
                <p className="community-header__fullname">{community.fullName}</p>
              )}
            </div>
            {fbUser && (
              <button
                onClick={handleSubscribe}
                disabled={subLoading}
                className={`feed-page__btn ${isSubscribed ? "feed-page__btn--outline" : "feed-page__btn--filled"}`}
              >
                {subLoading ? "..." : isSubscribed ? "Joined" : "Join"}
              </button>
            )}
          </div>

          {/* Create Post */}
          {fbUser && canWrite && (
            <div className="feed-page__create-card">
              {!showNew ? (
                <button
                  className="feed-page__create-trigger"
                  onClick={() => setShowNew(true)}
                >
                  <span className="feed-page__create-icon">✏️</span>
                  <span>Create Post in c/{communityId}</span>
                </button>
              ) : (
                <form onSubmit={handleCreate} className="feed-page__create-form">
                  <input
                    className="feed-page__input"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <textarea
                    className="feed-page__textarea"
                    placeholder="What's on your mind?"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    required
                  />
                  <input
                    className="feed-page__input"
                    placeholder="Tags (comma separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <select
                    className="feed-page__select"
                    value={flashDuration}
                    onChange={(e) =>
                      setFlashDuration(e.target.value as "" | "1" | "3" | "24")
                    }
                  >
                    <option value="">Normal post</option>
                    <option value="1">Flash: 1 hour</option>
                    <option value="3">Flash: 3 hours</option>
                    <option value="24">Flash: 24 hours</option>
                  </select>
                  <div className="feed-page__form-actions">
                    <button
                      type="button"
                      onClick={() => setShowNew(false)}
                      className="feed-page__btn feed-page__btn--outline"
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="feed-page__btn feed-page__btn--filled"
                      disabled={busy}
                    >
                      {busy ? "Posting…" : "Post"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          {fbUser && !canWrite && (
            <div className="feed-page__create-card">
              <div className="feed-page__empty">
                Read-only account: you can browse and like posts, but only confirmed student emails can create new threads.
              </div>
            </div>
          )}

          {error && <p className="feed-page__error">{error}</p>}

          {/* Posts List */}
          {loading ? (
            <div className="feed-page__loading">Loading posts…</div>
          ) : filteredPosts.length === 0 ? (
            <div className="feed-page__empty">
              No posts in c/{communityId} yet. Be the first to post!
            </div>
          ) : (
            <div className="feed-page__list">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Community Info */}
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
        </aside>
      </main>
    </div>
  );
}
