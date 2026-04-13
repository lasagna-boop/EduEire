import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import AppHeader from "../components/AppHeader";
import { useExpiryCountdown } from "../hooks/useFlashCountdown";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { listThreads, type Thread } from "../lib/firestore";
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
    }
  }, [resolvedUid, profileKeyParam, navigate]);

  useEffect(() => {
    if (resolvedUid) void load();
  }, [resolvedUid, load]);

  const isSelf = fbUser?.uid === resolvedUid;

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
      </main>
    </div>
  );
}
