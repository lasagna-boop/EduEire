import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import { FeedPageHeader } from "../components/FeedPageHeader";
import {
  getUserSubscriptions,
  getCommunity,
  unsubscribeFromCommunity,
  listThreads,
  type Community as CommunityType,
  type Thread,
} from "../lib/firestore";
import { threadVisibleOnProfile } from "../lib/firestoreFormat";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import { useAuth } from "../context/useAuth";
import { useLogout } from "../hooks/useLogout";
import type { PostCardPost } from "../types/postCard";

export default function Profile() {
  const { user: fbUser, studentEmailConfirmed, accessMode } = useAuth();
  const handleLogout = useLogout();

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
      const { threads: allThreads } = await listThreads({ authorId: fbUser.uid, pageSize: 30 });
      const now = Date.now();
      const threads = allThreads.filter((t: Thread) => threadVisibleOnProfile(t, now));
      const mapped = await threadsToPostCardPosts(threads, "default");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="feed-page">
      <FeedPageHeader
        actions={
          fbUser ? (
            <>
              <Link to="/feed" className="feed-page__btn feed-page__btn--outline">
                Feed
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

      <main className="feed-page__main profile-main">
        <div className="feed-page__content">
          <div className="profile-header">
            <h1 className="profile-header__title">Profile</h1>
            <p className="profile-header__email">{fbUser?.email || fbUser?.displayName || "—"}</p>
            <p className="profile-header__email">
              Student email confirmed: {studentEmailConfirmed ? "Yes" : "No"}
            </p>
            <p className="profile-header__email">
              Account mode: {accessMode === "full" ? "Full access" : "Read-only"}
            </p>
          </div>

          <h2 className="profile-posts__heading">My Posts</h2>

          {postsLoading && myPosts.length === 0 ? (
            <div className="feed-page__loading">Loading posts...</div>
          ) : null}
          {!postsLoading && myPosts.length === 0 ? (
            <div className="feed-page__empty">
              You haven&apos;t posted anything yet.
              <br />
              <Link
                to="/feed"
                className="feed-page__btn feed-page__btn--filled"
                style={{ marginTop: 16, display: "inline-block" }}
              >
                Go to Feed
              </Link>
            </div>
          ) : null}
          {myPosts.length > 0 ? (
            <div className="feed-page__list">
              {myPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="feed-page__right-sidebar profile-sidebar">
          <div className="feed-page__sidebar-card">
            <h3>My Communities</h3>
            {loading && subscriptions.length === 0 ? (
              <p className="profile-sidebar-loading">Loading...</p>
            ) : null}
            {!loading && subscriptions.length === 0 ? (
              <div className="profile-empty">
                <p>You haven&apos;t joined any communities yet.</p>
                <Link to="/feed" className="feed-page__btn feed-page__btn--filled">
                  Browse Feed
                </Link>
              </div>
            ) : null}
            {subscriptions.length > 0 ? (
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
                      type="button"
                      onClick={() => handleUnsubscribe(c.id)}
                      disabled={unsubbing === c.id}
                      className="profile-subscription-unsub"
                    >
                      {unsubbing === c.id ? "..." : "Leave"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
      </main>
    </div>
  );
}
