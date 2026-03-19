import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import { CommunitiesSidebar } from "../components/CommunitiesSidebar";
import { CreateThreadCard } from "../components/CreateThreadCard";
import { FeedPageHeader } from "../components/FeedPageHeader";
import {
  listThreads,
  listCommunities,
  seedCommunities,
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
  const { user: fbUser, canWrite } = useAuth();
  const handleLogout = useLogout();

  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [adminUser, setAdminUser] = useState(false);
  const [communityId, setCommunityId] = useState("");

  const loadCommunities = async () => {
    try {
      let list = await listCommunities();
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

  const filteredPosts = searchQuery
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

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
        <CommunitiesSidebar communities={communities} />

        <div className="feed-page__content">
          <CreateThreadCard
            mode="feed"
            fbUser={fbUser}
            canWrite={canWrite}
            communities={communities}
            communityId={communityId}
            onCommunityIdChange={setCommunityId}
            onPosted={load}
            onFormError={setError}
            triggerLabel="Create Post"
            readOnlyMessage="Your account is in read-only mode. Confirm a student email to create threads and comments."
          />

          {error && <p className="feed-page__error">{error}</p>}

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
        </aside>
      </main>
    </div>
  );
}
