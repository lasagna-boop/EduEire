import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { isAdmin } from "../lib/firestore";
import { moderateContent, checkProfanity } from "../lib/moderation";
import { checkSpam } from "../lib/moderationSpam";
import { useAuth } from "../context/useAuth";
import "../styles/spam-filter-lab.css";

/** Mirrors `moderationSpam.ts` — for labels only */
const SPAM_TAG_WEIGHTS: Record<string, number> = {
  spam_links: 0.35,
  spam_caps: 0.2,
  spam_char_run: 0.15,
  spam_repetition: 0.2,
  spam_keywords: 0.25,
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function SpamFilterLab() {
  const { user: fbUser } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!fbUser) return;
    isAdmin(fbUser.uid)
      .then((ok) => {
        setAuthorized(ok);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [fbUser]);

  const combined = useMemo(() => moderateContent(title, body), [title, body]);
  const profanityOnly = useMemo(
    () => checkProfanity(`${title}\n${body}`),
    [title, body]
  );
  const spamOnly = useMemo(() => checkSpam(`${title}\n${body}`), [title, body]);

  if (checking) {
    return (
      <div className="feed-page">
        <div className="feed-page__loading" style={{ margin: 40 }}>
          Checking access...
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="feed-page">
        <AppHeader activeTopLink="communities" />
        <main className="feed-page__main" style={{ justifyContent: "center" }}>
          <div className="feed-page__empty">
            Access denied. Admin privileges required.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <AppHeader activeTopLink="communities" />

      <main className="feed-page__main admin-main">
        <div className="feed-page__content spam-lab">
          <Link to="/admin" className="spam-lab__back">
            ← Back to moderation queue
          </Link>

          <header className="spam-lab__header">
            <h1 className="spam-lab__title">Spam filter lab</h1>
            <p className="spam-lab__lede">
              Live preview of the same <strong>client Layer 1</strong> pipeline used before
              posts are saved (profanity + spam heuristics + quality signals). Empty title is
              fine — use body only to mimic comments.
            </p>
          </header>

          <div className="spam-lab__grid">
            <div>
              <label className="spam-lab__label" htmlFor="spam-lab-title">
                Title (optional)
              </label>
              <input
                id="spam-lab-title"
                className="spam-lab__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Thread title"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="spam-lab__label" htmlFor="spam-lab-body">
                Body
              </label>
              <textarea
                id="spam-lab-body"
                className="spam-lab__textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Paste spam or benign text here..."
                spellCheck
              />
              <p className="spam-lab__note">
                Client flags when <code>spamScore ≥ 0.5</code> or profanity matches (same as
                create flow).
              </p>
            </div>
          </div>

          <section className="spam-lab__results" aria-live="polite">
            <div className="spam-lab__verdict">
              <span
                className={
                  combined.flagged ? "spam-lab__pill spam-lab__pill--warn" : "spam-lab__pill spam-lab__pill--ok"
                }
              >
                {combined.flagged ? "Would block / flag in UI" : "Passes Layer 1"}
              </span>
            </div>

            <div className="spam-lab__meters">
              <div>
                <div className="spam-lab__meter-label">Combined spam score (Layer 1)</div>
                <div className="spam-lab__meter-value">{pct(combined.spamScore ?? 0)}</div>
              </div>
              <div>
                <div className="spam-lab__meter-label">Heuristic spam only (no quality)</div>
                <div className="spam-lab__meter-value">{pct(spamOnly.spamScore)}</div>
              </div>
              <div>
                <div className="spam-lab__meter-label">Client “toxicity” estimate</div>
                <div className="spam-lab__meter-value">{pct(combined.toxicityScore ?? 0)}</div>
              </div>
            </div>

            <div className="spam-lab__split">
              <div className="spam-lab__tags">
                <strong>Profanity</strong>
                {profanityOnly.matches.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>No keyword hits</p>
                ) : (
                  <ul className="spam-lab__tag-list">
                    {profanityOnly.matches.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="spam-lab__tags">
                <strong>Spam signals</strong>
                {spamOnly.matches.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>No signal tags</p>
                ) : (
                  <ul className="spam-lab__tag-list">
                    {spamOnly.matches.map((m) => (
                      <li key={m}>
                        {m}{" "}
                        <span style={{ opacity: 0.75 }}>
                          (+{SPAM_TAG_WEIGHTS[m] ?? "?"})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="spam-lab__tags">
              <strong>All match tags (deduped)</strong>
              {combined.matches.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.9rem" }}>—</p>
              ) : (
                <p style={{ margin: 0, fontSize: "0.9rem" }}>{combined.matches.join(", ")}</p>
              )}
            </div>

            <p className="spam-lab__disclaimer">
              <strong>Server (Layer 2)</strong> runs again in Cloud Functions with the same
              keyword list and spam math, plus optional Google Perspective toxicity when{" "}
              <code>PERSPECTIVE_API_KEY</code> is set. Final moderation status on saved
              documents may differ slightly from this lab.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
