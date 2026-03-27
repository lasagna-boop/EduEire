import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SlideMenu from "../components/SlideMenu";
import {
  isAdmin,
  listFlaggedThreads,
  setModerationStatus,
  type FlaggedItem,
} from "../lib/firestore";
import { useAuth } from "../context/useAuth";
import { formatFirestoreDay } from "../lib/firestoreFormat";
import { logout } from "../lib/auth";

function formatDate(ts: unknown): string {
  const s = formatFirestoreDay(ts);
  return s === "just now" ? "—" : s;
}

function moderationDocPath(item: FlaggedItem): string {
  if (item.type === "thread") return `threads/${item.threadId}`;
  if (item.type === "flair") return `flairs/${item.id}`;
  return `threads/${item.threadId}/posts/${item.id}`;
}

function flaggedItemTypeLabel(type: FlaggedItem["type"]): string {
  if (type === "thread") return "Thread";
  if (type === "flair") return "Flair";
  return "Comment";
}

function toxicityScoreColor(score: number): string {
  if (score >= 0.7) return "#ff9f1c";
  if (score >= 0.4) return "#ff9f1c";
  return "#2d6a4f";
}

function spamScoreColor(score: number): string {
  if (score >= 0.7) return "#ff9f1c";
  if (score >= 0.4) return "#ff9f1c";
  return "#2d6a4f";
}

export default function Admin() {
  const { user: fbUser } = useAuth();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!fbUser) return;
    isAdmin(fbUser.uid)
      .then((ok) => {
        setAuthorized(ok);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [fbUser]);

  const load = async () => {
    setLoading(true);
    try {
      const flagged = await listFlaggedThreads();
      setItems(flagged);
    } catch (e) {
      console.error("Failed to load flagged items", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) load();
  }, [authorized]);

  const handleAction = async (item: FlaggedItem, action: "approved" | "rejected") => {
    setActing(item.id);
    try {
      await setModerationStatus(moderationDocPath(item), action);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      console.error("Failed to update moderation status", e);
    } finally {
      setActing(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (checking) {
    return (
      <div className="feed-page">
        <div className="feed-page__loading" style={{ margin: 40 }}>Checking access...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="feed-page">
        <header className="feed-page__header">
          <SlideMenu />
          <Link to="/" className="feed-page__logo">
            <img src="/logo.png" alt="EduÉire" className="feed-page__logo-img" />
          </Link>
          <div style={{ flex: 1 }} />
        </header>
        <main className="feed-page__main" style={{ justifyContent: "center" }}>
          <div className="feed-page__empty">Access denied. Admin privileges required.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <header className="feed-page__header">
        <SlideMenu />
        <Link to="/" className="feed-page__logo">
          <img src="/logo.png" alt="EduÉire" className="feed-page__logo-img" />
        </Link>
        <div className="feed-page__search" style={{ flex: 1 }} />
        <div className="feed-page__actions">
          <Link to="/feed" className="feed-page__btn feed-page__btn--outline">
            Feed
          </Link>
          <button onClick={handleLogout} className="feed-page__btn feed-page__btn--outline">
            Log Out
          </button>
        </div>
      </header>

      <main className="feed-page__main admin-main">
        <div className="feed-page__content">
          <div className="admin-header">
            <h1 className="admin-header__title">Moderation Queue</h1>
            <p className="admin-header__subtitle">
              Review flagged content — approve or reject
            </p>
          </div>

          {loading ? (
            <div className="feed-page__loading">Loading flagged content...</div>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="feed-page__empty">
              No content pending review. All clear!
            </div>
          ) : null}
          {!loading && items.length > 0 ? (
            <div className="admin-queue">
              {items.map((item) => (
                <div key={`${item.type}-${item.id}`} className="admin-card">
                  <div className="admin-card__badge">
                    {flaggedItemTypeLabel(item.type)}
                  </div>

                  <div className="admin-card__meta">
                    {item.communityId && (
                      <span className="admin-card__community">c/{item.communityId}</span>
                    )}
                    {item.communityId ? " • " : ""}@{item.authorName} • {formatDate(item.createdAt)}
                  </div>

                  {item.title && (
                    <h3 className="admin-card__title">{item.title}</h3>
                  )}
                  <p className="admin-card__body">{item.body}</p>

                  {item.moderationMatches.length > 0 && (
                    <div className="admin-card__flags">
                      Flagged for: {item.moderationMatches.join(", ")}
                    </div>
                  )}

                  {item.toxicityScore != null ? (
                    <div
                      className="admin-card__toxicity"
                      style={{
                        color: toxicityScoreColor(item.toxicityScore),
                      }}
                    >
                      Toxicity Score: {(item.toxicityScore * 100).toFixed(1)}%
                    </div>
                  ) : null}

                  <div
                    className="admin-card__toxicity"
                    style={{
                      color: spamScoreColor(item.spamScore ?? 0),
                    }}
                  >
                    Spam Score: {((item.spamScore ?? 0) * 100).toFixed(1)}%
                  </div>

                  <div className="admin-card__actions">
                    <button
                      className="admin-card__btn admin-card__btn--approve"
                      onClick={() => handleAction(item, "approved")}
                      disabled={acting === item.id}
                    >
                      {acting === item.id ? "..." : "Approve"}
                    </button>
                    <button
                      className="admin-card__btn admin-card__btn--reject"
                      onClick={() => handleAction(item, "rejected")}
                      disabled={acting === item.id}
                    >
                      {acting === item.id ? "..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
