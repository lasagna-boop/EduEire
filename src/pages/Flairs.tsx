import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FlairCard from "../components/FlairCard";
import SlideMenu from "../components/SlideMenu";
import { useAuth } from "../context/useAuth";
import { logout } from "../lib/auth";
import { createFlair, listFlairs, type Flair } from "../lib/firestore";
import { moderateContent } from "../lib/moderation";

export default function Flairs() {
  const { user: fbUser, canWrite } = useAuth();

  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await listFlairs({ pageSize: 50 });
      setFlairs(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "failed to load flairs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch((err) => console.error("Failed to load flairs", err));
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return flairs;
    return flairs.filter((f) => {
      const t = f.title.toLowerCase();
      const d = (f.description ?? "").toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [flairs, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;

    setBusy(true);
    setError(null);

    const titleTrimmed = title.trim();
    const modResult = moderateContent(titleTrimmed, "");
    if (modResult.flagged) {
      setError("Your flair contains inappropriate language and cannot be published.");
      setBusy(false);
      return;
    }

    try {
      await createFlair({
        title: titleTrimmed,
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
        toxicityScore: modResult.toxicityScore ?? 0,
        spamScore: modResult.spamScore ?? 0,
      });
      setTitle("");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "failed to create flair");
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

  return (
    <div className="feed-page">
      <header className="feed-page__header">
        <SlideMenu />
        <Link to="/" className="feed-page__logo">
          <img src="/logo.png" alt="EduÉire" className="feed-page__logo-img" />
        </Link>

        <form className="feed-page__search" onSubmit={(e) => e.preventDefault()}>
          <span className="feed-page__search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search flairs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="feed-page__search-input"
          />
        </form>

        <div className="feed-page__actions">
          {fbUser && (
            <>
              <Link to="/profile" className="feed-page__user feed-page__user--link">
                {fbUser.displayName || fbUser.email}
              </Link>
              <button onClick={handleLogout} className="feed-page__btn feed-page__btn--outline">
                Log Out
              </button>
            </>
          )}
        </div>
      </header>

      <main className="feed-page__main">
        <div className="feed-page__content flairs-page">
          <div className="flairs-page__header">
            <h1 className="flairs-page__title">Flair Topics</h1>
            <p className="flairs-page__subtitle">
              Propose discussion topics and vote them up/down.
            </p>
          </div>

          {fbUser && canWrite && (
            <div className="flairs-page__create-card">
              <h2 className="flairs-page__create-title">Propose a new flair</h2>
              <form onSubmit={handleCreate} className="feed-page__create-form">
                <input
                  className="feed-page__input"
                  placeholder="Flair title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <div className="feed-page__form-actions">
                  <button
                    type="submit"
                    className="feed-page__btn feed-page__btn--filled"
                    disabled={busy || !title.trim()}
                  >
                    {busy ? "Publishing…" : "Publish"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {fbUser && !canWrite && (
            <div className="flairs-page__create-card">
              <div className="feed-page__empty">
                Read-only account. Confirm a student email to propose new flairs.
              </div>
            </div>
          )}

          {error && <p className="feed-page__error">{error}</p>}

          <div className="feed-page__list">
            {loading && filtered.length === 0 ? (
              <div className="feed-page__loading">Loading flairs…</div>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <div className="feed-page__empty">No flairs yet. Be the first to propose one!</div>
            ) : null}
            {filtered.length > 0
              ? filtered.map((f) => <FlairCard key={f.id} flair={f} />)
              : null}
          </div>
        </div>
      </main>
    </div>
  );
}

