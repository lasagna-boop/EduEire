import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import AppHeader from "../components/AppHeader";
import { UserProfileLink } from "../components/UserProfileLink";
import { useExpiryCountdown } from "../hooks/useFlashCountdown";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  followUser,
  getUserSocialStats,
  isFollowingUser,
  listFollowingUsers,
  listThreads,
  listTopActiveFollowers,
  unfollowUser,
  type CommunityActiveSubscriber,
  type Thread,
  type UserProfileSummary,
} from "../lib/firestore";
import { resolveProfileKeyToUid } from "../lib/publicProfileRoute";
import { threadVisibleOnProfile } from "../lib/firestoreFormat";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import { fetchUserProfileStatus } from "../lib/userFlashStatus";
import { useAuth } from "../context/useAuth";
import type { PostCardPost } from "../types/postCard";

function profileHandleFromEmail(
  email: string | null | undefined,
  displayName: string | null | undefined,
): string {
  if (email?.includes("@")) {
    return email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "") || "member";
  }
  if (displayName?.trim()) {
    return displayName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9._-]/g, "");
  }
  return "member";
}

function displayInitial(name: string | null | undefined): string {
  const n = name?.trim();
  if (n) return n.charAt(0).toUpperCase();
  return "?";
}

export default function UserProfile() {
  const { profileKey: profileKeyParam } = useParams<{ profileKey: string }>();
  const navigate = useNavigate();
  const { user: fbUser } = useAuth();

  const [resolvedUid, setResolvedUid] = useState<string | null>(null);
  const [resolveDone, setResolveDone] = useState(false);

  const [displayTitle, setDisplayTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [flashText, setFlashText] = useState("");
  const [flashExpiresAt, setFlashExpiresAt] = useState<unknown | null>(null);
  const [profileBio, setProfileBio] = useState("");
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [topFollowers, setTopFollowers] = useState<CommunityActiveSubscriber[]>([]);
  const [followingUsers, setFollowingUsers] = useState<UserProfileSummary[]>([]);
  const [socialStats, setSocialStats] = useState({ followingCount: 0, followersCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const flashCountdown = useExpiryCountdown(flashExpiresAt);
  const flashStatusLive =
    flashText.length > 0 &&
    flashExpiresAt != null &&
    flashCountdown !== null &&
    flashCountdown !== "Expired";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolveDone(false);
      setResolvedUid(null);
      if (!profileKeyParam) {
        setResolveDone(true);
        return;
      }
      const uid = await resolveProfileKeyToUid(profileKeyParam);
      if (cancelled) return;
      setResolveDone(true);
      if (uid) setResolvedUid(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileKeyParam]);

  const load = useCallback(async () => {
    if (!resolvedUid || !profileKeyParam) return;
    setProfileLoading(true);
    setSocialLoading(true);
    setProfileLoadError(false);
    try {
      const userRef = await getDoc(doc(db, "users", resolvedUid));
      const snap = await fetchUserProfileStatus(resolvedUid);
      setFlashText(snap.flash.text);
      setFlashExpiresAt(snap.flash.expiresAt);
      setProfileBio(snap.profileBio);

      const { threads: allThreads } = await listThreads({ authorId: resolvedUid, pageSize: 50 });
      const now = Date.now();
      const threads = allThreads.filter((t: Thread) => threadVisibleOnProfile(t, now));
      const mapped = await threadsToPostCardPosts(threads, "default");
      setPosts(mapped);

      let title = "";
      let email: string | null = null;
      let dname: string | null = null;
      let publicHandle: string | null = null;
      if (userRef.exists()) {
        const d = userRef.data();
        dname = typeof d.displayName === "string" ? d.displayName : null;
        email = typeof d.email === "string" ? d.email : null;
        publicHandle = typeof d.publicHandle === "string" ? d.publicHandle : null;
        title =
          dname?.trim() ||
          (email?.includes("@") ? email.split("@")[0] : null) ||
          "";
      }
      if (!title && mapped.length > 0) {
        title = mapped[0].author;
      }
      if (!title) title = "User";
      setDisplayTitle(title);
      setHandle(
        publicHandle?.trim() ||
          profileHandleFromEmail(email ?? undefined, dname ?? undefined),
      );

      const selfView = fbUser?.uid === resolvedUid;
      const [top, following, stats, followingState] = await Promise.all([
        listTopActiveFollowers(resolvedUid, 3),
        listFollowingUsers(resolvedUid, 24),
        getUserSocialStats(resolvedUid),
        fbUser && !selfView ? isFollowingUser(fbUser.uid, resolvedUid) : Promise.resolve(false),
      ]);
      setTopFollowers(top);
      setFollowingUsers(following);
      setSocialStats(stats);
      setIsFollowing(followingState);

      if (
        publicHandle &&
        profileKeyParam === resolvedUid &&
        publicHandle !== resolvedUid
      ) {
        navigate(`/u/${encodeURIComponent(publicHandle)}`, { replace: true });
      }
    } catch (e) {
      console.error("UserProfile load failed", e);
      setProfileLoadError(true);
    } finally {
      setProfileLoading(false);
      setSocialLoading(false);
    }
  }, [resolvedUid, profileKeyParam, navigate, fbUser]);

  useEffect(() => {
    if (resolvedUid) load();
  }, [resolvedUid, load]);

  const isSelf = fbUser?.uid === resolvedUid;

  const handleToggleFollow = async () => {
    if (!fbUser || !resolvedUid || isSelf || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowUser(fbUser.uid, resolvedUid);
      } else {
        await followUser(fbUser.uid, resolvedUid);
      }
      const nextFollowing = !isFollowing;
      setIsFollowing(nextFollowing);
      setSocialStats((prev) => ({
        ...prev,
        followersCount: Math.max(0, prev.followersCount + (nextFollowing ? 1 : -1)),
      }));
      const refreshedTop = await listTopActiveFollowers(resolvedUid, 3);
      setTopFollowers(refreshedTop);
    } catch (e) {
      console.error("Failed to toggle follow", e);
    } finally {
      setFollowBusy(false);
    }
  };

  if (!profileKeyParam) {
    return <Navigate to="/feed" replace />;
  }

  if (resolveDone && !resolvedUid && profileKeyParam) {
    return (
      <div className="feed-page">
        <AppHeader activeTopLink="communities" />
        <main className="feed-page__main profile-main">
          <div className="feed-page__content">
            <div className="feed-page__empty">User not found.</div>
            <Link
              to="/feed"
              className="feed-page__btn feed-page__btn--filled"
              style={{ marginTop: 16, display: "inline-block" }}
            >
              Back to feed
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (profileLoadError) {
    return (
      <div className="feed-page">
        <AppHeader activeTopLink="communities" />
        <main className="feed-page__main profile-main">
          <div className="feed-page__content">
            <div className="feed-page__empty">Could not load this profile.</div>
            <Link
              to="/feed"
              className="feed-page__btn feed-page__btn--filled"
              style={{ marginTop: 16, display: "inline-block" }}
            >
              Back to feed
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const initial = displayInitial(displayTitle);

  return (
    <div className="feed-page">
      <AppHeader activeTopLink="communities" />

      <main className="feed-page__main profile-main">
        <div className="feed-page__content">
          {!resolveDone || profileLoading || !resolvedUid ? (
            <div className="feed-page__loading">Loading profile…</div>
          ) : null}

          {resolveDone && resolvedUid && !profileLoading ? (
            <>
              <section
                className={`profile-hero${flashStatusLive ? " profile-hero--flash" : ""}`}
                aria-label="Profile summary"
              >
                <div className="profile-hero__cover" aria-hidden />
                <div className="profile-hero__avatar-row">
                  <div className="profile-hero__avatar-wrap">
                    <div
                      className="profile-hero__avatar profile-hero__avatar--fallback"
                      aria-hidden
                    >
                      {initial}
                    </div>
                  </div>
                </div>
                <div className="profile-hero__body">
                  <h1 className="profile-hero__title">{displayTitle}</h1>
                  <p className="profile-hero__handle">@{handle}</p>
                  {!isSelf && fbUser ? (
                    <button
                      type="button"
                      className="profile-user-follow-btn"
                      onClick={() => handleToggleFollow()}
                      disabled={followBusy}
                      aria-pressed={isFollowing}
                    >
                      {followBusy ? "Please wait..." : isFollowing ? "Following" : "Follow"}
                    </button>
                  ) : null}
                  {flashStatusLive ? (
                    <div className="profile-hero__flash-bar thread-detail__flash-bar">
                      <span className="post-card__flash-banner">
                        <span className="post-card__flash-dot" />
                        <span>Flash status</span>
                      </span>
                      <span className="thread-detail__flash-timer">
                        {flashCountdown === "Expired"
                          ? "Expired"
                          : `${flashCountdown} remaining`}
                      </span>
                    </div>
                  ) : null}
                  {flashStatusLive ? (
                    <p className="profile-hero__bio">{flashText}</p>
                  ) : profileBio ? (
                    <p className="profile-hero__bio">{profileBio}</p>
                  ) : null}
                </div>
              </section>

              {isSelf ? (
                <p className="profile-userprofile-self-hint">
                  <Link to="/profile" className="profile-userprofile-self-hint__link">
                    Edit profile &amp; account settings
                  </Link>
                </p>
              ) : null}

              <div className="profile-stats" role="group" aria-label="Profile stats">
                <div className="profile-stats__item">
                  <div className="profile-stats__value">{posts.length}</div>
                  <div className="profile-stats__label">Posts</div>
                </div>
                <div className="profile-stats__item">
                  <div className="profile-stats__value profile-stats__value--accent">
                    {socialLoading ? "…" : socialStats.followersCount}
                  </div>
                  <div className="profile-stats__label">Followers</div>
                </div>
                <div className="profile-stats__item">
                  <div className="profile-stats__value">
                    {socialLoading ? "…" : socialStats.followingCount}
                  </div>
                  <div className="profile-stats__label">Following</div>
                </div>
              </div>

              <h2 className="profile-posts__heading">Posts</h2>
              {posts.length === 0 ? (
                <div className="feed-page__empty">No posts yet.</div>
              ) : (
                <div className="feed-page__list">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
        <aside className="feed-page__right-sidebar profile-sidebar">
          <div className="feed-page__sidebar-card">
            <h3>Friends &amp; followers</h3>
            <div className="feed-stream__active-box" aria-label="Top active followers">
              <p className="feed-stream__active-title">Top active followers</p>
              {socialLoading ? (
                <p className="feed-stream__active-empty">Loading followers...</p>
              ) : topFollowers.length > 0 ? (
                <ul className="feed-stream__active-list">
                  {topFollowers.map((user, idx) => (
                    <li key={user.id}>
                      <span className="feed-stream__active-rank">#{idx + 1}</span>
                      <UserProfileLink
                        profileKey={user.profileKey}
                        label={user.name}
                        className="feed-stream__active-name"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="feed-stream__active-empty">No followers yet.</p>
              )}
            </div>
            <div className="profile-following-list">
              <p className="profile-following-list__title">Following</p>
              {socialLoading ? (
                <p className="feed-stream__active-empty">Loading following...</p>
              ) : followingUsers.length > 0 ? (
                <ul className="profile-following-list__items">
                  {followingUsers.slice(0, 6).map((user) => (
                    <li key={user.id}>
                      <UserProfileLink
                        profileKey={user.profileKey}
                        label={user.name}
                        className="profile-following-list__link"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="feed-stream__active-empty">Not following anyone yet.</p>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
