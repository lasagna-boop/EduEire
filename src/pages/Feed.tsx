import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import { createThread, listThreads } from "../lib/firestore";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";

type UserLite = { name: string } | null;

type PostCardPost = {
  id: string;
  title: string;
  body: string;
  university: string;
  tags: string[];
  author: string;
  createdAt: string;
  score?: number;
};

function formatCreatedAt(createdAt: any): string {
  try {
    if (createdAt?.toDate) return createdAt.toDate().toISOString().slice(0, 10);
  } catch {}
  return "just now";
}

export default function Feed({ user }: { user: UserLite }) {
  const { user: fbUser } = useAuth();

  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [university, setUniversity] = useState("TU Dublin");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);

    try {
      const { threads } = await listThreads({ pageSize: 30 });

      const mapped: PostCardPost[] = threads.map((t: any) => ({
        id: t.id,
        title: t.title,
        body: t.body ?? "",
        university: t.university ?? "",
        tags: Array.isArray(t.tags) ? t.tags : [],
        author: t.authorName || "anon",
        createdAt: formatCreatedAt(t.createdAt),
        score: t.score ?? 0,
      }));

      setPosts(mapped);
    } catch (e: any) {
      setError(e?.message ?? "failed to load threads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;

    setBusy(true);
    setError(null);

    try {
      const tagList = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createThread({
        title: title.trim(),
        body: body.trim(),
        university: university.trim(),
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implement search filtering
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
        <Link to="/" className="feed-page__logo">
          <img src="/logo.png" alt="EduÉire" className="feed-page__logo-img" />
        </Link>

        <form className="feed-page__search" onSubmit={handleSearch}>
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
              <span className="feed-page__user">
                {fbUser.displayName || fbUser.email}
              </span>
              <button onClick={handleLogout} className="feed-page__btn feed-page__btn--outline">
                Log Out
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="feed-page__main">
        <div className="feed-page__content">
          {/* Create Post Card */}
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
                    <input
                      className="feed-page__input"
                      placeholder="University"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      required
                    />
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

          {/* Posts List */}
          {loading ? (
            <div className="feed-page__loading">Loading posts…</div>
          ) : filteredPosts.length === 0 ? (
            <div className="feed-page__empty">No posts yet. Be the first to post!</div>
          ) : (
            <div className="feed-page__list">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} user={user} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="feed-page__sidebar">
          <div className="feed-page__sidebar-card">
            <h3>About EduÉire</h3>
            <p>Ireland's community for students and educators to connect, share, and learn together.</p>
          </div>
          {fbUser && (
            <div className="feed-page__sidebar-card">
              <h3>Quick Links</h3>
              <ul className="feed-page__quick-links">
                <li><Link to="/">Home</Link></li>
                <li><button onClick={() => setShowNew(true)}>Create Post</button></li>
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}