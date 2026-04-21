import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FlairCard from "../components/FlairCard";
import { FlairsEngagementSurveys } from "../components/FlairsEngagementSurveys";
import AppHeader from "../components/AppHeader";
import { useAuth } from "../context/useAuth";
import { createFlair, subscribeFlairs, type Flair } from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { moderateContentV2 } from "../lib/moderation";

type SortMode = "score" | "new";

function sortFlairs(list: Flair[], mode: SortMode): Flair[] {
  const copy = [...list];
  if (mode === "new") {
    copy.sort((a, b) => {
      const ma = firestoreMs(a.createdAt);
      const mb = firestoreMs(b.createdAt);
      return mb - ma;
    });
    return copy;
  }
  copy.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return copy;
}

function firestoreMs(ts: unknown): number {
  if (
    typeof ts === "object" &&
    ts !== null &&
    "toMillis" in ts &&
    typeof (ts as { toMillis: () => number }).toMillis === "function"
  ) {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export default function Flairs() {
  const { user: fbUser, canWrite } = useAuth();

  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("score");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(null);
    setLoading(true);
    const unsub = subscribeFlairs(
      { pageSize: 80 },
      (list) => {
        setFlairs(list);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(errorMessage(e) || "failed to load flairs");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = !q
      ? flairs
      : flairs.filter((f) => {
          const t = f.title.toLowerCase();
          const d = (f.description ?? "").toLowerCase();
          return t.includes(q) || d.includes(q);
        });
    return sortFlairs(base, sortMode);
  }, [flairs, searchQuery, sortMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;

    setBusy(true);
    setError(null);

    const titleTrimmed = title.trim();
    const descTrimmed = description.trim();
    const mod = moderateContentV2(titleTrimmed, descTrimmed);
    if (mod.flagged) {
      setError("Your proposal contains language we can’t publish. Revise and try again.");
      setBusy(false);
      return;
    }

    try {
      await createFlair({
        title: titleTrimmed,
        description: descTrimmed || undefined,
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
        toxicityScore: mod.toxicityScore ?? 0,
        spamScore: mod.spamScore ?? 0,
      });
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(errorMessage(err) || "failed to create flair");
    } finally {
      setBusy(false);
    }
  };

  const onTitleChange = useCallback((v: string) => {
    if (v.length <= 80) setTitle(v);
  }, []);

  const onDescChange = useCallback((v: string) => {
    if (v.length <= 300) setDescription(v);
  }, []);

  return (
    <div className="feed-page feed-page--flairs">
      <AppHeader
        activeTopLink="communities"
        search={{
          placeholder: "Search ideas shaping EduÉire…",
          value: searchQuery,
          onChange: setSearchQuery,
        }}
      />

      <main className="feed-page__main flairs-page__main">
        <div className="feed-page__content flairs-page">
          <header className="flairs-page__hero">
            <div className="flairs-page__hero-copy">
              <p className="flairs-page__eyebrow">Cognitive engagement</p>
              <h1 className="flairs-page__title">Topic flairs</h1>
              <p className="flairs-page__subtitle">
                This is the layer where users actively shape how EduÉire thinks. Propose ideas,
                challenge weak ones, and converge on better labels for future discussion quality.
                Top-voted flairs become candidate structures for feed navigation and community
                context.
              </p>
              <div className="flairs-page__hero-actions">
                <Link to="/feed" className="flairs-page__btn flairs-page__btn--primary">
                  Join live discussions
                </Link>
                <a href="#propose" className="flairs-page__btn flairs-page__btn--ghost">
                  Add your proposal
                </a>
              </div>
            </div>
            <aside className="flairs-page__hero-panel" aria-labelledby="flairs-limits-heading">
              <h2 id="flairs-limits-heading" className="flairs-page__panel-title">
                User-built governance
              </h2>
              <ul className="flairs-page__panel-list">
                <li>
                  <strong>One proposal per week</strong> per verified student keeps ideation focused
                  (resets Sunday 00:00 Dublin).
                </li>
                <li>Voting ranks cognitive value: clearer, more useful labels rise naturally.</li>
                <li>Moderation protects quality so the system evolves without noise overload.</li>
              </ul>
            </aside>
          </header>

          <FlairsEngagementSurveys />

          <section className="flairs-page__steps" aria-labelledby="flairs-steps-heading">
            <h2 id="flairs-steps-heading" className="flairs-page__steps-title">
              How users shape the network
            </h2>
            <ol className="flairs-page__steps-list">
              <li>
                <span className="flairs-page__step-index">1</span>
                <div>
                  <h3 className="flairs-page__step-heading">Frame the idea</h3>
                  <p>
                    Propose a precise topic label and optional context so others can evaluate it
                    quickly.
                  </p>
                </div>
              </li>
              <li>
                <span className="flairs-page__step-index">2</span>
                <div>
                  <h3 className="flairs-page__step-heading">Stress-test with votes</h3>
                  <p>
                    Collective voting filters weak abstractions and promotes tags that improve
                    discovery.
                  </p>
                </div>
              </li>
              <li>
                <span className="flairs-page__step-index">3</span>
                <div>
                  <h3 className="flairs-page__step-heading">Operationalize in the feed</h3>
                  <p>
                    Use selected flairs to guide stronger threads, cleaner search, and shared
                    vocabulary.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {fbUser && canWrite ? (
            <section id="propose" className="flairs-page__create">
              <div className="flairs-page__create-inner">
                <h2 className="flairs-page__create-heading">Submit a topic proposal</h2>
                <p className="flairs-page__create-lede">
                  Think in terms of cognitive value: would this label help someone find, structure,
                  or deepen discussion? Title is required (2-80). Description is optional (max 300).
                </p>
                <form onSubmit={handleCreate} className="flairs-page__form">
                  <div className="flairs-page__field">
                    <label htmlFor="flair-title">Title</label>
                    <input
                      id="flair-title"
                      className="flairs-page__input"
                      placeholder="e.g. Academic burnout prevention"
                      value={title}
                      onChange={(e) => onTitleChange(e.target.value)}
                      autoComplete="off"
                      minLength={2}
                      maxLength={80}
                      required
                    />
                    <span className="flairs-page__counter" aria-live="polite">
                      {title.trim().length}/80
                    </span>
                  </div>
                  <div className="flairs-page__field">
                    <label htmlFor="flair-desc">Description (optional)</label>
                    <textarea
                      id="flair-desc"
                      className="flairs-page__textarea"
                      placeholder="What conversations should this flair unlock? Who benefits from it?"
                      value={description}
                      onChange={(e) => onDescChange(e.target.value)}
                      rows={3}
                      maxLength={300}
                    />
                    <span className="flairs-page__counter" aria-live="polite">
                      {description.length}/300
                    </span>
                  </div>
                  <div className="flairs-page__form-actions">
                    <button
                      type="submit"
                      className="flairs-page__btn flairs-page__btn--primary"
                      disabled={busy || title.trim().length < 2}
                    >
                      {busy ? "Publishing…" : "Publish to the community"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {fbUser && !canWrite ? (
            <section className="flairs-page__readonly">
              <p>
                <strong>Read-only account.</strong> Verify a recognised Irish university email to
                submit new proposals. You can still vote and influence ranking.
              </p>
            </section>
          ) : null}

          {!fbUser ? (
            <section className="flairs-page__readonly">
              <p>
                <Link to="/login">Log in</Link> to vote and contribute to how EduÉire is organised.
              </p>
            </section>
          ) : null}

          {error ? (
            <p className="flairs-page__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flairs-page__toolbar">
            <p className="flairs-page__toolbar-label">Ranking lens</p>
            <div className="flairs-page__sort" role="group" aria-label="Sort proposals">
              <button
                type="button"
                className={[
                  "flairs-page__sort-btn",
                  sortMode === "score" ? "flairs-page__sort-btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSortMode("score")}
              >
                Highest signal
              </button>
              <button
                type="button"
                className={[
                  "flairs-page__sort-btn",
                  sortMode === "new" ? "flairs-page__sort-btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSortMode("new")}
              >
                Fresh ideas
              </button>
            </div>
            <span className="flairs-page__count" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "proposal" : "proposals"}
              {searchQuery.trim() ? " (filtered)" : ""}
            </span>
          </div>

          <div className="flairs-page__list">
            {loading && filtered.length === 0 ? (
              <div className="flairs-page__loading" role="status">
                Loading community signal…
              </div>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <div className="flairs-page__empty">
                <p>No proposals match {searchQuery.trim() ? "your search" : "yet"}.</p>
                {!searchQuery.trim() && canWrite ? (
                  <p>Start the first cognitive thread marker for this community.</p>
                ) : null}
              </div>
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
