import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SlideMenu from "../components/SlideMenu";
import PostCard from "../components/PostCard";
import {
  getUserSubscriptions,
  getCommunity,
  unsubscribeFromCommunity,
  listThreads,
  countPosts,
  type Community as CommunityType,
} from "../lib/firestore";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";

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

export default function Profile() {
  const { user: fbUser } = useAuth();

  const [subscriptions, setSubscriptions] = useState<CommunityType[]>([]);
  const [myPosts, setMyPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [unsubbing, setUnsubbing] = useState<string | null>(null);

  const loadSubscriptions = async () => {
    if (!fbUser) return;
    setLoading(true);
    try {
      const ids = await getUserSubscriptions(fbUser.uid);
      const subs: CommunityType[] = [];
      for (const id of ids) {
        const c = await getCommunity(id);
        if (c) subs.push(c);
      }
      setSubscriptions(subs);
    } catch (e) {
      console.error("Failed to load subscriptions", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMyPosts = async () => {
    if (!fbUser) return;
    setPostsLoading(true);
    try {
      const { threads } = await listThreads({ authorId: fbUser.uid, pageSize: 30 });
      const counts = await Promise.all(threads.map((t) => countPosts(t.id)));

      const mapped: PostCardPost[] = threads.map((t: any, i: number) => ({
        id: t.id,
        title: t.title,
        body: t.body ?? "",
        communityId: t.communityId ?? "",
        tags: Array.isArray(t.tags) ? t.tags : [],
        author: t.authorName || "anon",
        createdAt: formatCreatedAt(t.createdAt),
        score: t.score ?? 0,
        postCount: counts[i],
      }));
      setMyPosts(mapped);
    } catch (e) {
      console.error("Failed to load user posts", e);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    loadMyPosts();
  }, [fbUser?.uid]);

  const handleUnsubscribe = async (communityId: string) => {
    if (!fbUser) return;
    setUnsubbing(communityId);
    try {
      await unsubscribeFromCommunity(fbUser.uid, communityId);
      await loadSubscriptions();
    } catch (e) {
      console.error("Failed to unsubscribe", e);
    } finally {
      setUnsubbing(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <div className="feed-page">
      <header className="feed-page__header">
        <SlideMenu />
        <Link to="/" className="feed-page__logo">
          <img src="/logo.png" alt="EduÉire" className="feed-page__logo-img" />
        </Link>

        <div className="feed-page__search" style={{ flex: 1 }} />

        <div className="feed-page__actions">
          {fbUser && (
            <>
              <Link to="/feed" className="feed-page__btn feed-page__btn--outline">
                Feed
              </Link>
              <button onClick={handleLogout} className="feed-page__btn feed-page__btn--outline">
                Log Out
              </button>
            </>
          )}
        </div>
      </header>

      <main className="feed-page__main profile-main">
        <div className="feed-page__content">
          <div className="profile-header">
            <h1 className="profile-header__title">Profile</h1>
            <p className="profile-header__email">{fbUser?.email || fbUser?.displayName || "—"}</p>
          </div>

          <h2 className="profile-posts__heading">My Posts</h2>

          {postsLoading ? (
            <div className="feed-page__loading">Loading posts...</div>
          ) : myPosts.length === 0 ? (
            <div className="feed-page__empty">
              You haven't posted anything yet.
              <br />
              <Link to="/feed" className="feed-page__btn feed-page__btn--filled" style={{ marginTop: 16, display: "inline-block" }}>
                Go to Feed
              </Link>
            </div>
          ) : (
            <div className="feed-page__list">
              {myPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        <aside className="feed-page__right-sidebar profile-sidebar">
          <div className="feed-page__sidebar-card">
            <h3>My Communities</h3>
            {loading ? (
              <p className="profile-sidebar-loading">Loading...</p>
            ) : subscriptions.length === 0 ? (
              <div className="profile-empty">
                <p>You haven't joined any communities yet.</p>
                <Link to="/feed" className="feed-page__btn feed-page__btn--filled">
                  Browse Feed
                </Link>
              </div>
            ) : (
              <ul className="profile-subscriptions">
                {subscriptions.map((c) => (
                  <li key={c.id} className="profile-subscription-item">
                    <Link to={`/c/${c.id}`} className="profile-subscription-link">
                      <span className="profile-subscription-icon">🎓</span>
                      <div className="profile-subscription-info">
                        <span className="profile-subscription-name">c/{c.id}</span>
                        <span className="profile-subscription-full">{c.fullName}</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleUnsubscribe(c.id)}
                      disabled={unsubbing === c.id}
                      className="profile-subscription-unsub"
                    >
                      {unsubbing === c.id ? "..." : "Leave"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
