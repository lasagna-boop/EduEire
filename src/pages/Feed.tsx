import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import { CommunitiesSidebar, SECTION_OPTIONS } from "../components/CommunitiesSidebar";
import { CreateThreadCard } from "../components/CreateThreadCard";
import { FeedPageHeader } from "../components/FeedPageHeader";
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
import { useLogout } from "../hooks/useLogout";
import type { PostCardPost } from "../types/postCard";

export default function Feed() {
  const { user: fbUser, canWrite, accessMode } = useAuth();
  const handleLogout = useLogout();

  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);

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

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { threads: allThreads } = await listThreads({ pageSize: 30 });
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
          placeholder: "Search posts",
          value: searchQuery,
          onChange: setSearchQuery,
        }}
        actions={
          fbUser ? (
            <>
              <Link to="/profile" className="feed-page__user feed-page__user--link">
                {fbUser.displayName || fbUser.email}
              </Link>
              {adminUser && (
                <Link
                  to="/admin"
                  className="feed-page__btn feed-page__btn--outline"
                  style={{ fontSize: "0.8rem" }}
                >
                  Admin
                </Link>
              )}
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
          activeSection={selectedSection}
          onSectionSelect={(section) =>
            setSelectedSection((prev) => (prev === section ? "" : section))
          }
        />

        <div className="feed-page__content">
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
            <div className="feed-page__empty">No posts yet. Be the first to post!</div>
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
            <h3>About EduÉire</h3>
            <p>
              Ireland&apos;s community for students and educators to connect, share, and learn
              together.
            </p>
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
