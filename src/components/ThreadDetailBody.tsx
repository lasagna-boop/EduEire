import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { CommentThread } from "./CommentThread";
import { UserProfileLink } from "./UserProfileLink";
import { formatFirestoreDay } from "../lib/firestoreFormat";
import { useFlashCountdown } from "../hooks/useFlashCountdown";
import { buildCommentTree, countCommentsInTree } from "../lib/commentTree";
import type { Post, Thread, Vote } from "../lib/firestore";
import { formatCommunityHandle } from "../lib/communityDisplay";

export type ThreadDetailBodyProps = {
  thread: Thread;
  threadId: string;
  score: number;
  vote: Vote;
  canVote: boolean;
  onVote: (newVote: Vote) => void;
  fbUser: User | null;
  canComment: boolean;
  isFetching: boolean;
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onSubmitComment: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
  comments: Post[];
  onCommentFlagged: (commentId: string) => void;
  onReplySubmit: (parentPostId: string, body: string) => Promise<void>;
  /** null while resolving; anonymous label until admin check completes */
  viewerIsAdmin: boolean | null;
};

export function ThreadDetailBody({
  thread,
  threadId,
  score,
  vote,
  canVote,
  onVote,
  fbUser,
  canComment,
  isFetching,
  commentBody,
  onCommentBodyChange,
  onSubmitComment,
  submitting,
  error,
  comments,
  onCommentFlagged,
  onReplySubmit,
  viewerIsAdmin,
}: ThreadDetailBodyProps) {
  const flashRemaining = useFlashCountdown(thread);
  const commentRoots = useMemo(() => buildCommentTree(comments), [comments]);
  const commentCount = useMemo(
    () => countCommentsInTree(commentRoots),
    [commentRoots]
  );
  const voteDisabledClass =
    canVote && !isFetching ? "" : "post-card__vote-btn--disabled";
  const upTitle = canVote ? "Upvote" : "Login to vote";
  const downTitle = canVote ? "Downvote" : "Login to vote";
  const authorLabel =
    thread.isAnonymous && viewerIsAdmin !== true
      ? "Anonymous"
      : thread.authorName;

  return (
    <>
      <div className={`thread-detail${flashRemaining ? " thread-detail--flash" : ""}`}>
        <div className="thread-detail__votes">
          <button
            type="button"
            className={[
              "post-card__vote-btn",
              vote === "up" ? "post-card__vote-btn--up" : "",
              voteDisabledClass,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onVote(vote === "up" ? null : "up")}
            disabled={isFetching || canVote === false}
            title={upTitle}
          >
            ▲
          </button>
          <div className="post-card__score">{score}</div>
          <button
            type="button"
            className={[
              "post-card__vote-btn",
              vote === "down" ? "post-card__vote-btn--down" : "",
              voteDisabledClass,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onVote(vote === "down" ? null : "down")}
            disabled={isFetching || canVote === false}
            title={downTitle}
          >
            ▼
          </button>
        </div>

        <div className="thread-detail__body">
          {flashRemaining ? (
            <div className="thread-detail__flash-bar">
              <span className="post-card__flash-banner">
                <span className="post-card__flash-dot" />
                <span>Flash Thread</span>
              </span>
              <span className="thread-detail__flash-timer">
                {flashRemaining === "Expired"
                  ? "Expired"
                  : `${flashRemaining} remaining`}
              </span>
            </div>
          ) : null}
          <div className="post-card__meta">
            <Link to={`/c/${thread.communityId}`} className="post-card__community">
              {formatCommunityHandle(thread.communityId)}
            </Link>
            <span>
              {" "}
              <UserProfileLink
                profileKey={thread.authorPublicHandle || thread.authorId}
                label={authorLabel}
                className="post-card__author-link"
                anonymous={thread.isAnonymous === true}
                viewerIsAdmin={viewerIsAdmin === true}
              />{" "}
              • {formatFirestoreDay(thread.createdAt)}
            </span>
          </div>
          <h1 className="thread-detail__title">{thread.title}</h1>
          <p className="thread-detail__text">{thread.body}</p>
          <div className="post-card__tags">
            {thread.tags?.map((t) => (
              <span key={t} className="post-card__tag">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {fbUser && canComment ? (
        <form onSubmit={onSubmitComment} className="comment-form">
          <textarea
            className="comment-form__input"
            placeholder="Write a comment..."
            value={commentBody}
            onChange={(e) => onCommentBodyChange(e.target.value)}
            rows={3}
            required
            disabled={isFetching}
          />
          <div className="comment-form__actions">
            <button
              type="submit"
              className="feed-page__btn feed-page__btn--filled"
              disabled={isFetching || submitting || commentBody.trim() === ""}
            >
              {submitting ? "Posting..." : "Comment"}
            </button>
          </div>
        </form>
      ) : null}

      {fbUser && canComment === false ? (
        <div className="comment-form">
          <p className="comments-section__empty">
            Read-only accounts can comment only in Admissions or First Year/Transition threads.
          </p>
        </div>
      ) : null}

      {error ? <p className="feed-page__error">{error}</p> : null}

      <div className="comments-section">
        <h2 className="comments-section__heading">
          {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
        </h2>

        {commentCount === 0 ? (
          <p className="comments-section__empty">No comments yet. Be the first to reply!</p>
        ) : (
          <div className="comments-list">
            {commentRoots.map((node) => (
              <CommentThread
                key={node.id}
                node={node}
                threadId={threadId}
                depth={0}
                canComment={canComment}
                disabled={isFetching}
                submitting={submitting}
                onReplySubmit={onReplySubmit}
                onCommentFlagged={onCommentFlagged}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
