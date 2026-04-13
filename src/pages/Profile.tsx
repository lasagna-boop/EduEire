import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import AppHeader from "../components/AppHeader";
import { useExpiryCountdown } from "../hooks/useFlashCountdown";
import { errorMessage } from "../lib/errors";
import {
  getUserSubscriptions,
  getCommunity,
  unsubscribeFromCommunity,
  listThreads,
  type Community as CommunityType,
  type Thread,
} from "../lib/firestore";
import { parseFirestoreDate, threadVisibleOnProfile } from "../lib/firestoreFormat";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import {
  clearUserFlashStatus,
  clearUserProfileBio,
  fetchUserProfileStatus,
  setUserFlashStatus,
  setUserProfileBio,
  USER_FLASH_STATUS_MAX_CHARS,
  USER_PROFILE_BIO_MAX_CHARS,
} from "../lib/userFlashStatus";
import { useAuth } from "../context/useAuth";
import type { PostCardPost } from "../types/postCard";

type ProfileTab = "posts" | "about";

type SnippetMode = "permanent" | "flash";

function flashStoredStillActive(text: string, expiresAt: unknown | null): boolean {
  if (text.length === 0 || expiresAt == null) return false;
  try {
    return parseFirestoreDate(expiresAt).getTime() > Date.now();
  } catch {
    return false;
  }
}

function IconProfileLine() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFlashBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M11 21h-1l1-7H5l11-14h2l-1 8h6L11 21z"
      />
    </svg>
  );
}

function profileHandle(email: string | null | undefined, displayName: string | null | undefined): string {
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

function displayInitial(name: string | null | undefined, email: string | null | undefined): string {
  const n = name?.trim();
  if (n) return n.charAt(0).toUpperCase();
  const e = email?.trim();
  if (e) return e.charAt(0).toUpperCase();
  return "?";
}

export default function Profile() {
  const { user: fbUser, studentEmailConfirmed, accessMode } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const eireversary = fbUser?.metadata?.creationTime
    ? new Date(fbUser.metadata.creationTime).toLocaleDateString("en-IE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const handle = useMemo(
    () => profileHandle(fbUser?.email ?? undefined, fbUser?.displayName ?? undefined),
    [fbUser?.email, fbUser?.displayName],
  );

  const displayName =
    fbUser?.displayName?.trim() ||
    (fbUser?.email?.includes("@") ? fbUser.email.split("@")[0] : null) ||
    "Member";

  const [subscriptions, setSubscriptions] = useState<CommunityType[]>([]);
  const [myPosts, setMyPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [unsubbing, setUnsubbing] = useState<string | null>(null);

  const [flashText, setFlashText] = useState("");
  const [flashExpiresAt, setFlashExpiresAt] = useState<unknown | null>(null);
  const [profileBio, setProfileBio] = useState("");
  const [snippetDraft, setSnippetDraft] = useState("");
  const [snippetMode, setSnippetMode] = useState<SnippetMode>("permanent");
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [snippetError, setSnippetError] = useState<string | null>(null);

  const flashCountdown = useExpiryCountdown(flashExpiresAt);
  const flashStatusLive =
    flashText.length > 0 &&
    flashExpiresAt != null &&
    flashCountdown !== null &&
    flashCountdown !== "Expired";

  const loadProfileSnippet = useCallback(async () => {
    if (!fbUser) return;
    setStatusLoading(true);
    setSnippetError(null);
    try {
      const snap = await fetchUserProfileStatus(fbUser.uid);
      setProfileBio(snap.profileBio);
      setFlashText(snap.flash.text);
      setFlashExpiresAt(snap.flash.expiresAt);
      const flashActive = flashStoredStillActive(snap.flash.text, snap.flash.expiresAt);
      if (flashActive) {
        setSnippetMode("flash");
        setSnippetDraft(snap.flash.text);
      } else {
        setSnippetMode("permanent");
        setSnippetDraft(snap.profileBio);
      }
    } catch (e) {
      console.error("Failed to load profile snippet", e);
      setSnippetError(errorMessage(e));
    } finally {
      setStatusLoading(false);
    }
  }, [fbUser]);

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
    loadProfileSnippet();
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

  const photoUrl = fbUser?.photoURL;
  const initial = displayInitial(fbUser?.displayName ?? undefined, fbUser?.email ?? undefined);

  const snippetMaxLen =
    snippetMode === "flash" ? USER_FLASH_STATUS_MAX_CHARS : USER_PROFILE_BIO_MAX_CHARS;

  const toggleSnippetMode = () => {
    const next: SnippetMode = snippetMode === "flash" ? "permanent" : "flash";
    setSnippetMode(next);
    setSnippetDraft(next === "flash" ? flashText : profileBio);
    setSnippetError(null);
  };

  const handleSaveSnippet = async () => {
    if (!fbUser) return;
    setStatusSaving(true);
    setSnippetError(null);
    try {
      if (snippetMode === "flash") {
        await setUserFlashStatus(fbUser.uid, snippetDraft);
      } else {
        await setUserProfileBio(fbUser.uid, snippetDraft);
      }
      await loadProfileSnippet();
    } catch (e) {
      setSnippetError(errorMessage(e));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleClearSnippet = async () => {
    if (!fbUser) return;
    setStatusSaving(true);
    setSnippetError(null);
    try {
      if (snippetMode === "flash") {
        await clearUserFlashStatus(fbUser.uid);
      } else {
        await clearUserProfileBio(fbUser.uid);
      }
      await loadProfileSnippet();
    } catch (e) {
      setSnippetError(errorMessage(e));
    } finally {
      setStatusSaving(false);
    }
  };

  const clearDisabled =
    snippetMode === "flash"
      ? !flashText && snippetDraft.trim() === ""
      : !profileBio && snippetDraft.trim() === "";

  return (
    <div className="feed-page">
      <AppHeader activeTopLink="communities" />

      <main className="feed-page__main profile-main">
        <div className="feed-page__content">
          <section
            className={`profile-hero${flashStatusLive ? " profile-hero--flash" : ""}`}
            aria-label="Profile summary"
          >
            <div className="profile-hero__cover" aria-hidden />
            <div className="profile-hero__avatar-row">
              <div className="profile-hero__avatar-wrap">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="profile-hero__avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="profile-hero__avatar profile-hero__avatar--fallback"
                    aria-hidden
                  >
                    {initial}
                  </div>
                )}
              </div>
            </div>
            <div className="profile-hero__body">
              <h1 className="profile-hero__title">{displayName}</h1>
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
              <ul className="profile-hero__meta">
                <li>
                  <span aria-hidden>📅</span>
                  Joined {eireversary}
                </li>
                <li>
                  <span aria-hidden>🎓</span>
                  Student email {studentEmailConfirmed ? "verified" : "not verified"}
                </li>
              </ul>
            </div>
          </section>

          <section className="profile-status-card" aria-labelledby="profile-snippet-heading">
            <h2 id="profile-snippet-heading" className="profile-status-card__title">
              Profile status
            </h2>
            <p className="profile-status-card__hint">
              One line under your name. Use the icon in the corner: lines = permanent until you
              change it; lightning = 24-hour flash (same highlight as flash threads). Active flash
              replaces the permanent line on your profile.
            </p>
            <div className="profile-status-card__field-wrap">
              <textarea
                className="profile-status-card__field"
                maxLength={snippetMaxLen}
                rows={3}
                placeholder={
                  snippetMode === "flash"
                    ? "Flash status — 24 hours after save"
                    : "Permanent line about you"
                }
                value={snippetDraft}
                disabled={statusLoading || statusSaving}
                onChange={(e) => setSnippetDraft(e.target.value)}
                aria-label={
                  snippetMode === "flash" ? "Flash status (24 hours)" : "Permanent profile line"
                }
              />
              <button
                type="button"
                className={`profile-status-card__mode-btn${
                  snippetMode === "flash" ? " profile-status-card__mode-btn--flash" : ""
                }`}
                onClick={toggleSnippetMode}
                disabled={statusLoading || statusSaving}
                title={
                  snippetMode === "flash"
                    ? "24-hour flash — click for permanent line"
                    : "Permanent line — click for 24-hour flash"
                }
                aria-label={
                  snippetMode === "flash"
                    ? "Switch to permanent profile line"
                    : "Switch to 24-hour flash status"
                }
                aria-pressed={snippetMode === "flash"}
              >
                {snippetMode === "flash" ? <IconFlashBolt /> : <IconProfileLine />}
              </button>
            </div>
            <div className="profile-status-card__footer">
              <span className="profile-status-card__count">
                {snippetDraft.length}/{snippetMaxLen}
                {snippetMode === "flash" ? " · flash" : " · permanent"}
              </span>
              <div className="profile-status-card__actions">
                <button
                  type="button"
                  className="profile-status-card__btn profile-status-card__btn--primary"
                  disabled={statusLoading || statusSaving}
                  onClick={() => void handleSaveSnippet()}
                >
                  {statusSaving ? "Saving…" : snippetMode === "flash" ? "Save (24h)" : "Save"}
                </button>
                <button
                  type="button"
                  className="profile-status-card__btn profile-status-card__btn--ghost"
                  disabled={statusLoading || statusSaving || clearDisabled}
                  onClick={() => void handleClearSnippet()}
                >
                  Clear
                </button>
              </div>
              {snippetError ? <p className="profile-status-card__error">{snippetError}</p> : null}
            </div>
          </section>

          <div className="profile-stats" role="group" aria-label="Profile stats">
            <div className="profile-stats__item">
              <div className="profile-stats__value">{postsLoading ? "…" : myPosts.length}</div>
              <div className="profile-stats__label">Posts</div>
            </div>
            <div className="profile-stats__divider" aria-hidden />
            <div className="profile-stats__item">
              <div className="profile-stats__value profile-stats__value--accent">
                {loading ? "…" : subscriptions.length}
              </div>
              <div className="profile-stats__label">Communities</div>
            </div>
            <div className="profile-stats__divider" aria-hidden />
            <div className="profile-stats__item">
              <div className="profile-stats__value">{accessMode === "full" ? "Full" : "Read"}</div>
              <div className="profile-stats__label">Access</div>
            </div>
          </div>

          <div className="profile-tabs" role="tablist" aria-label="Profile sections">
            <button
              type="button"
              role="tab"
              id="profile-tab-posts"
              aria-selected={tab === "posts"}
              aria-controls="profile-panel-posts"
              className={`profile-tabs__btn${tab === "posts" ? " profile-tabs__btn--active" : ""}`}
              onClick={() => setTab("posts")}
            >
              Posts
            </button>
            <button
              type="button"
              role="tab"
              id="profile-tab-about"
              aria-selected={tab === "about"}
              aria-controls="profile-panel-about"
              className={`profile-tabs__btn${tab === "about" ? " profile-tabs__btn--active" : ""}`}
              onClick={() => setTab("about")}
            >
              About
            </button>
          </div>

          {tab === "posts" ? (
            <div
              id="profile-panel-posts"
              role="tabpanel"
              aria-labelledby="profile-tab-posts"
            >
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
          ) : null}

          {tab === "about" ? (
            <div
              id="profile-panel-about"
              role="tabpanel"
              aria-labelledby="profile-tab-about"
              className="profile-about"
            >
              <h2 className="profile-about__title">Account</h2>
              <ul className="profile-about__list">
                <li>
                  <strong>Sign-in email</strong>
                  <br />
                  {fbUser?.email ?? "—"}
                </li>
                <li>
                  <strong>Student email confirmed</strong>
                  <br />
                  {studentEmailConfirmed ? "Yes" : "No"}
                </li>
                <li>
                  <strong>Account mode</strong>
                  <br />
                  {accessMode === "full" ? "Full access" : "Read-only"}
                </li>
                <li>
                  <strong>Éireversary</strong>
                  <br />
                  {eireversary}
                </li>
              </ul>
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
