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

type Props = {
  comment: Post;
  threadId: string;
  onFlagged?: () => void;
};

export function CommentItem({ comment, threadId, onFlagged }: Props) {
  const { user: fbUser } = useAuth();
  const [score, setScore] = useState(comment.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const canVote = !!fbUser;

  useEffect(() => {
    if (fbUser) {
      getCommentVote(threadId, comment.id, fbUser.uid)
        .then(setVote)
        .catch((e) => console.error("Failed to get comment vote", e));
      isAdmin(fbUser.uid).then(setAdmin);
    }
  }, [fbUser, threadId, comment.id]);

  const handleFlag = async () => {
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
      await voteOnComment(threadId, comment.id, fbUser.uid, newVote);
    } catch (e) {
      console.error("Failed to vote on comment", e);
      setVote(oldVote);
      setScore(oldScore);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="comment">
      <div className="comment__votes">
        <button
          type="button"
          className={[
            "comment__vote-btn",
            vote === "up" ? "comment__vote-btn--up" : "",
            !canVote ? "comment__vote-btn--disabled" : "",
          ].join(" ")}
          onClick={() => handleVote(vote === "up" ? null : "up")}
          disabled={!canVote}
        >
          ▲
        </button>
        <span className="comment__score">{score}</span>
        <button
          type="button"
          className={[
            "comment__vote-btn",
            vote === "down" ? "comment__vote-btn--down" : "",
            !canVote ? "comment__vote-btn--disabled" : "",
          ].join(" ")}
          onClick={() => handleVote(vote === "down" ? null : "down")}
          disabled={!canVote}
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
            disabled={flagged}
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
