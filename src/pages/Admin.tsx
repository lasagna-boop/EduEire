import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import {
  isAdmin,
  listModeratorApplications,
  listFlaggedThreads,
  setModerationStatus,
  type FlaggedItem,
  type ModeratorApplication,
} from "../lib/firestore";
import { useAuth } from "../context/useAuth";
import { formatFirestoreDay } from "../lib/firestoreFormat";
import { formatCommunityHandle } from "../lib/communityDisplay";

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

/** 0–100: higher is more credible in the model */
function credibilityScoreColor(score: number): string {
  if (score >= 70) return "#2d6a4f";
  if (score >= 40) return "#b08900";
  return "#c1121f";
}

export default function Admin() {
  const { user: fbUser } = useAuth();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [applications, setApplications] = useState<ModeratorApplication[]>([]);
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
      const [flagged, mods] = await Promise.all([
        listFlaggedThreads(),
        listModeratorApplications({ pageSize: 60 }),
      ]);
      setItems(flagged);
      setApplications(mods);
    } catch (e) {
      console.error("Failed to load moderation admin data", e);
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
        <AppHeader activeTopLink="communities" />
        <main className="feed-page__main" style={{ justifyContent: "center" }}>
          <div className="feed-page__empty">Access denied. Admin privileges required.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <AppHeader activeTopLink="communities" />

      <main className="feed-page__main admin-main">
        <div className="feed-page__content">
          <div className="admin-header">
            <h1 className="admin-header__title">Moderation Queue</h1>
            <p className="admin-header__subtitle">
              Review flagged content — approve or reject
            </p>
            <p className="admin-header__subtitle" style={{ marginTop: "0.5rem" }}>
              <Link to="/admin/spam-lab">Spam filter lab</Link>
              {" — "}test client moderation scores on pasted text
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
                      <span className="admin-card__community">
                        {formatCommunityHandle(item.communityId)}
                      </span>
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

                  {item.type !== "flair" ? (
                    <div
                      className="admin-card__credibility"
                      style={{
                        color:
                          item.credibilityScore != null
                            ? credibilityScoreColor(item.credibilityScore)
                            : "#718096",
                      }}
                    >
                      Credibility score:{" "}
                      {item.credibilityScore != null
                        ? `${item.credibilityScore}/100`
                        : "— (not computed yet)"}
                      {item.credibilityModelVersion
                        ? ` · model ${item.credibilityModelVersion}`
                        : ""}
                    </div>
                  ) : null}

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

          <div className="admin-header" style={{ marginTop: "20px" }}>
            <h2 className="admin-header__title" style={{ fontSize: "1.2rem", marginBottom: "6px" }}>
              Moderator Applications
            </h2>
            <p className="admin-header__subtitle">
              New applications submitted from the Moderator Team page.
            </p>
          </div>

          {loading ? (
            <div className="feed-page__loading">Loading applications...</div>
          ) : null}
          {!loading && applications.length === 0 ? (
            <div className="feed-page__empty">No moderator applications yet.</div>
          ) : null}
          {!loading && applications.length > 0 ? (
            <div className="admin-queue">
              {applications.map((app) => (
                <div key={app.id} className="admin-card">
                  <div className="admin-card__badge">Moderator</div>
                  <div className="admin-card__meta">
                    @{app.applicantName}
                    {app.applicantEmail ? ` (${app.applicantEmail})` : ""} • {formatDate(app.createdAt)}
                  </div>
                  <h3 className="admin-card__title">Motivation</h3>
                  <p className="admin-card__body">{app.motivation}</p>
                  {app.experience ? (
                    <>
                      <h3 className="admin-card__title">Experience</h3>
                      <p className="admin-card__body">{app.experience}</p>
                    </>
                  ) : null}
                  {app.availability ? (
                    <>
                      <h3 className="admin-card__title">Availability</h3>
                      <p className="admin-card__body">{app.availability}</p>
                    </>
                  ) : null}
                  <div className="admin-card__flags">Status: {app.status}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
