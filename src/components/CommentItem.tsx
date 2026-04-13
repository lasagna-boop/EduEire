import { useEffect, useState } from "react";
import { UserProfileLink } from "./UserProfileLink";
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
  canComment?: boolean;
  submitting?: boolean;
  onReplySubmit?: (parentPostId: string, body: string) => Promise<void>;
  onFlagged?: () => void;
  disabled?: boolean;
};

export function CommentItem({
  comment,
  threadId,
  canComment = false,
  submitting = false,
  onReplySubmit,
  onFlagged,
  disabled = false,
}: Readonly<Props>) {
  const { user: fbUser } = useAuth();
  const [score, setScore] = useState(comment.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const canVote = fbUser !== null;
  const showReply = Boolean(fbUser && canComment && onReplySubmit);

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

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onReplySubmit || !replyBody.trim() || replyBusy || submitting) return;
    setReplyBusy(true);
    try {
      await onReplySubmit(comment.id, replyBody.trim());
      setReplyBody("");
      setReplyOpen(false);
    } catch {
      // Parent sets global error; keep form open
    } finally {
      setReplyBusy(false);
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
          <UserProfileLink
            profileKey={comment.authorPublicHandle || comment.authorId}
            label={comment.authorName}
            className="comment__author comment__author--link"
          />
          <span className="comment__time">
            {timeAgoFromFirestore(comment.createdAt)}
          </span>
        </div>
        <p className="comment__text">{comment.body}</p>
        <div className="comment__actions">
          {showReply ? (
            <button
              type="button"
              className="comment__reply-toggle"
              onClick={() => setReplyOpen((v) => !v)}
              disabled={disabled || submitting}
            >
              {replyOpen ? "Cancel reply" : "Reply"}
            </button>
          ) : null}
          {admin ? (
            <button
              type="button"
              className={`post-card__flag-btn${flagged ? " post-card__flag-btn--flagged" : ""}`}
              onClick={handleFlag}
              disabled={disabled || flagged}
              title={flagged ? "Flagged for review" : "Flag for review"}
            >
              {flagged ? "🚩 Flagged" : "⚑ Flag"}
            </button>
          ) : null}
        </div>
        {showReply && replyOpen ? (
          <form className="comment-reply-form" onSubmit={handleReplySubmit}>
            <textarea
              className="comment-reply-form__input"
              placeholder={`Reply to @${comment.authorName}…`}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={3}
              required
              disabled={disabled || submitting || replyBusy}
            />
            <div className="comment-reply-form__actions">
              <button
                type="button"
                className="feed-page__btn feed-page__btn--outline"
                onClick={() => {
                  setReplyOpen(false);
                  setReplyBody("");
                }}
                disabled={replyBusy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="feed-page__btn feed-page__btn--filled"
                disabled={
                  disabled || submitting || replyBusy || replyBody.trim() === ""
                }
              >
                {replyBusy ? "Posting…" : "Post reply"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
