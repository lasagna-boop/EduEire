import { useEffect, useState } from "react";
import {
  getCommentVote,
  isAdmin,
  setModerationStatus,
  voteOnComment,
  type Post,
  type Vote,
} from "../lib/firestore";
import { useAuth } from "../context/useAuth";
import { timeAgoFromFirestore } from "../lib/firestoreFormat";
import { voteScoreDelta } from "../lib/voteScoreDelta";

type Props = {
  comment: Post;
  threadId: string;
  onFlagged?: () => void;
  disabled?: boolean;
};

export function CommentItem({
  comment,
  threadId,
  onFlagged,
  disabled = false,
}: Readonly<Props>) {
  const { user: fbUser } = useAuth();
  const [score, setScore] = useState(comment.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const canVote = fbUser !== null;

  useEffect(() => {
    if (fbUser) {
      getCommentVote(threadId, comment.id, fbUser.uid)
        .then(setVote)
        .catch((e) => console.error("Failed to get comment vote", e));
      isAdmin(fbUser.uid).then(setAdmin);
    }
  }, [fbUser, threadId, comment.id]);

  const handleFlag = async () => {
    if (disabled) return;
    if (!admin || flagged) return;
    try {
      await setModerationStatus(
        `threads/${threadId}/posts/${comment.id}`,
        "pending_review"
      );
      setFlagged(true);
      onFlagged?.();
    } catch (e) {
      console.error("Failed to flag comment", e);
    }
  };

  const handleVote = async (newVote: Vote) => {
    if (disabled) return;
    if (!canVote || !fbUser || voting) return;
    const oldVote = vote;
    const oldScore = score;

    const scoreChange = voteScoreDelta(oldVote, newVote);

    setVote(newVote);
    setScore((s) => s + scoreChange);
    setVoting(true);

    try {
      await voteOnComment(threadId, comment.id, fbUser.uid, newVote);
    } catch (e) {
      console.error("Failed to vote on comment", e);
      setVote(oldVote);
      setScore(oldScore);
    } finally {
      setVoting(false);
    }
  };

  const voteDisabledClass =
    canVote && !disabled ? "" : "comment__vote-btn--disabled";

  return (
    <div className="comment">
      <div className="comment__votes">
        <button
          type="button"
          className={[
            "comment__vote-btn",
            vote === "up" ? "comment__vote-btn--up" : "",
            voteDisabledClass,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => handleVote(vote === "up" ? null : "up")}
          disabled={disabled || canVote === false}
          title={canVote ? "Upvote" : "Login to vote"}
        >
          ▲
        </button>
        <span className="comment__score">{score}</span>
        <button
          type="button"
          className={[
            "comment__vote-btn",
            vote === "down" ? "comment__vote-btn--down" : "",
            voteDisabledClass,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => handleVote(vote === "down" ? null : "down")}
          disabled={disabled || canVote === false}
          title={canVote ? "Downvote" : "Login to vote"}
        >
          ▼
        </button>
      </div>
      <div className="comment__avatar">
        {(comment.authorName?.[0] ?? "?").toUpperCase()}
      </div>
      <div className="comment__body">
        <div className="comment__header">
          <span className="comment__author">@{comment.authorName}</span>
          <span className="comment__time">
            {timeAgoFromFirestore(comment.createdAt)}
          </span>
        </div>
        <p className="comment__text">{comment.body}</p>
        {admin && (
          <button
            type="button"
            className={`post-card__flag-btn${flagged ? " post-card__flag-btn--flagged" : ""}`}
            onClick={handleFlag}
            disabled={disabled || flagged}
            title={flagged ? "Flagged for review" : "Flag for review"}
            style={{ marginTop: 4 }}
          >
            {flagged ? "🚩 Flagged" : "⚑ Flag"}
          </button>
        )}
      </div>
    </div>
  );
}
