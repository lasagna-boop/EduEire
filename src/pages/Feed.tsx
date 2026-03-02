import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import SlideMenu from "../components/SlideMenu";
import {
  createThread,
  listThreads,
  listCommunities,
  seedCommunities,
  countPosts,
  isAdmin,
  type Community,
} from "../lib/firestore";
import { useAuth } from "../context/AuthContext";
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
};

function formatCreatedAt(createdAt: any): string {
  try {
    if (createdAt?.toDate) return createdAt.toDate().toISOString().slice(0, 10);
  } catch {}
  return "just now";
}

export default function Feed() {
  const { user: fbUser } = useAuth();

  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [adminUser, setAdminUser] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCommunities = async () => {
    try {
      let list = await listCommunities();
      
      // Auto-seed communities if none exist
      if (list.length === 0) {
        console.log("No communities found, seeding TUD, Trinity, UCD...");
        await seedCommunities();
        list = await listCommunities();
        console.log("Communities seeded:", list);
      }
      
      setCommunities(list);
      if (list.length > 0 && !communityId) {
        setCommunityId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load/seed communities:", e);
    }
  };

  const load = async () => {
    setError(null);
    setLoading(true);

    try {
      const { threads: allThreads } = await listThreads({ pageSize: 30 });
      const threads = allThreads.filter(
        (t: any) => !t.moderationStatus || t.moderationStatus === "approved"
      );

      const counts = await Promise.all(threads.map((t) => countPosts(t.id)));

      const mapped: PostCardPost[] = threads.map((t: any, i: number) => ({
        id: t.id,
        title: t.title,
        body: t.body ?? "",
        communityId: t.communityId ?? t.university ?? "",
        tags: Array.isArray(t.tags) ? t.tags : [],
        author: t.authorName || "anon",
        createdAt: formatCreatedAt(t.createdAt),
        score: t.score ?? 0,
        postCount: counts[i],
      }));

      setPosts(mapped);
    } catch (e: any) {
      setError(e?.message ?? "failed to load threads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunities();
    load();
    if (fbUser) isAdmin(fbUser.uid).then(setAdminUser);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser || !communityId) return;

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

      await createThread({
        title: title.trim(),
        body: body.trim(),
        communityId,
        tags: tagList,
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
      });

      setTitle("");
      setBody("");
      setTags("");
      setShowNew(false);

      await load();
    } catch (e: any) {
      setError(e?.message ?? "failed to create thread");
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
            placeholder="Search posts"
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
              {adminUser && (
                <Link to="/admin" className="feed-page__btn feed-page__btn--outline" style={{ fontSize: "0.8rem" }}>
                  Admin
                </Link>
              )}
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
                  <Link to={`/c/${c.id}`} className="feed-page__community-link">
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
          {fbUser && (
            <div className="feed-page__create-card">
              {!showNew ? (
                <button
                  className="feed-page__create-trigger"
                  onClick={() => setShowNew(true)}
                >
                  <span className="feed-page__create-icon">✏️</span>
                  <span>Create Post</span>
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
                  <div className="feed-page__form-row">
                    <select
                      className="feed-page__select"
                      value={communityId}
                      onChange={(e) => setCommunityId(e.target.value)}
                      required
                    >
                      <option value="">Select Community</option>
                      {communities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="feed-page__input"
                      placeholder="Tags (comma separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
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

          {error && <p className="feed-page__error">{error}</p>}

          {loading ? (
            <div className="feed-page__loading">Loading posts…</div>
          ) : filteredPosts.length === 0 ? (
            <div className="feed-page__empty">No posts yet. Be the first to post!</div>
          ) : (
            <div className="feed-page__list">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - About */}
        <aside className="feed-page__right-sidebar">
          <div className="feed-page__sidebar-card">
            <h3>About EduÉire</h3>
            <p>Ireland's community for students and educators to connect, share, and learn together.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}