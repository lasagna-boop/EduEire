import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import {
  getUserFlairVote,
  isAdmin,
  setModerationStatus,
  voteOnFlair,
  type Flair,
  type Vote,
} from "../lib/firestore";

function formatCreatedAt(createdAt: unknown): string {
  try {
    const ts = createdAt as { toDate?: () => Date };
    if (ts?.toDate) return ts.toDate().toISOString().slice(0, 10);
  } catch {
    /* ignore */
  }
  return "just now";
}

export default function FlairCard({ flair }: { flair: Flair }) {
  const { user: fbUser } = useAuth();

  const [score, setScore] = useState(flair.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [flagged, setFlagged] = useState(false);

  const canVote = !!fbUser;

  useEffect(() => {
    if (fbUser) {
      getUserFlairVote(flair.id, fbUser.uid)
        .then(setVote)
        .catch((e) => console.error("Failed to get flair vote", e));
      isAdmin(fbUser.uid).then(setAdmin);
    } else {
      setVote(null);
    }
  }, [fbUser, flair.id]);

  const handleFlag = async () => {
    if (!admin || flagged) return;
    try {
      await setModerationStatus(`flairs/${flair.id}`, "pending_review");
      setFlagged(true);
    } catch (e) {
      console.error("Failed to flag flair", e);
    }
  };

  useEffect(() => {
    setScore(flair.score ?? 0);
  }, [flair.score]);

  const handleVote = async (newVote: Vote) => {
    if (!canVote || !fbUser || voting) return;

    const oldVote = vote;
    const oldScore = score;

    let scoreChange = 0;
    if (oldVote === null && newVote === "up") scoreChange = 1;
    else if (oldVote === null && newVote === "down") scoreChange = -1;
    else if (oldVote === "up" && newVote === null) scoreChange = -1;
    else if (oldVote === "up" && newVote === "down") scoreChange = -2;
    else if (oldVote === "down" && newVote === null) scoreChange = 1;
    else if (oldVote === "down" && newVote === "up") scoreChange = 2;

    setVote(newVote);
    setScore((s) => s + scoreChange);
    setVoting(true);

    try {
      await voteOnFlair(flair.id, fbUser.uid, newVote);
    } catch (e) {
      console.error("Failed to vote on flair", e);
      setVote(oldVote);
      setScore(oldScore);
    } finally {
      setVoting(false);
    }
  };

  const handleUpvote = () => {
    if (vote === "up") handleVote(null);
    else handleVote("up");
  };

  const handleDownvote = () => {
    if (vote === "down") handleVote(null);
    else handleVote("down");
  };

  return (
    <div className="post-card">
      <div className="post-card__votes">
        <button
          className={[
            "post-card__vote-btn",
            vote === "up" ? "post-card__vote-btn--up" : "",
            !canVote ? "post-card__vote-btn--disabled" : "",
          ].join(" ")}
          onClick={handleUpvote}
          disabled={!canVote}
          aria-label="Upvote"
          title={!canVote ? "Login to vote" : "Upvote"}
        >
          ▲
        </button>

        <div className="post-card__score">{score}</div>

        <button
          className={[
            "post-card__vote-btn",
            vote === "down" ? "post-card__vote-btn--down" : "",
            !canVote ? "post-card__vote-btn--disabled" : "",
          ].join(" ")}
          onClick={handleDownvote}
          disabled={!canVote}
          aria-label="Downvote"
          title={!canVote ? "Login to vote" : "Downvote"}
        >
          ▼
        </button>
      </div>

      <div className="post-card__content">
        <div className="post-card__meta">
          <span className="post-card__community">Flair topic</span>
          <span> @{flair.authorName} • {formatCreatedAt(flair.createdAt)}</span>
        </div>

        <h3 className="post-card__title">{flair.title}</h3>

        {flair.description ? (
          <p className="post-card__body">{flair.description}</p>
        ) : null}

        <div className="post-card__footer">
          {admin && (
            <button
              className={`post-card__flag-btn${flagged ? " post-card__flag-btn--flagged" : ""}`}
              onClick={handleFlag}
              disabled={flagged}
              title={flagged ? "Flagged for review" : "Flag for review"}
            >
              {flagged ? "🚩 Flagged" : "⚑ Flag"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
