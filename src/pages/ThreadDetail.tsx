import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import SlideMenu from "../components/SlideMenu";
import {
  getThread,
  listPosts,
  addPost,
  getUserVote,
  voteOnThread,
  getCommentVote,
  voteOnComment,
  isAdmin,
  setModerationStatus,
  type Thread,
  type Post,
  type Vote,
} from "../lib/firestore";
import { useAuth } from "../context/useAuth";
import { errorMessage } from "../lib/errors";
import { formatFirestoreDay, parseFirestoreDate, timeAgoFromFirestore } from "../lib/firestoreFormat";
import { logout } from "../lib/auth";
import { checkProfanity } from "../lib/moderation";

function CommentItem({ comment, threadId, onFlagged }: { comment: Post; threadId: string; onFlagged?: () => void }) {
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
      await setModerationStatus(`threads/${threadId}/posts/${comment.id}`, "pending_review");
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
          <span className="comment__time">{timeAgoFromFirestore(comment.createdAt)}</span>
        </div>
        <p className="comment__text">{comment.body}</p>
        {admin && (
          <button
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

export default function ThreadDetail() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user: fbUser, canWrite } = useAuth();

  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const canVote = !!fbUser;

  const [flashRemaining, setFlashRemaining] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (flashTimer.current) clearInterval(flashTimer.current);
    if (!thread) { setFlashRemaining(null); return; }

    const raw = thread.flashExpiresAt;
    if (!raw) { setFlashRemaining(null); return; }

    const expiresMs = parseFirestoreDate(raw).getTime();

    const tick = () => {
      const diff = expiresMs - Date.now();
      if (diff <= 0) { setFlashRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setFlashRemaining(
        h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`
      );
    };

    tick();
    flashTimer.current = setInterval(tick, 1000);
    return () => { if (flashTimer.current) clearInterval(flashTimer.current); };
  }, [thread]);

  const load = async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const [t, posts] = await Promise.all([
        getThread(threadId),
        listPosts(threadId),
      ]);
      setThread(t);
      setComments(posts.filter((p) => !p.moderationStatus || p.moderationStatus === "approved"));
      if (t) setScore(t.score ?? 0);
    } catch (e) {
      console.error("Failed to load thread", e);
      setError("Failed to load thread");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    if (fbUser && threadId) {
      getUserVote(threadId, fbUser.uid)
        .then(setVote)
        .catch((e) => console.error("Failed to get vote", e));
    }
  }, [fbUser, threadId]);

  const handleVote = async (newVote: Vote) => {
    if (!canVote || !fbUser || voting || !threadId) return;
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
      await voteOnThread(threadId, fbUser.uid, newVote);
    } catch (e) {
      console.error("Failed to vote", e);
      setVote(oldVote);
      setScore(oldScore);
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser || !threadId || !commentBody.trim() || !canWrite) return;

    setSubmitting(true);
    setError(null);

    const modResult = checkProfanity(commentBody.trim());
    if (modResult.flagged) {
      setError("Your comment contains inappropriate language and cannot be published.");
      setSubmitting(false);
      return;
    }

    try {
      await addPost(threadId, {
        body: commentBody.trim(),
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
      });
      setCommentBody("");
      const posts = await listPosts(threadId);
      setComments(posts.filter((p) => !p.moderationStatus || p.moderationStatus === "approved"));
    } catch (e) {
      setError(errorMessage(e) || "Failed to add comment");
    } finally {
      setSubmitting(false);
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
        <div className="feed-page__search" style={{ flex: 1 }} />
        <div className="feed-page__actions">
          {fbUser && (
            <>
              <Link to="/feed" className="feed-page__btn feed-page__btn--outline">
                Feed
              </Link>
              <button onClick={handleLogout} className="feed-page__btn feed-page__btn--outline">
                Log Out
              </button>
            </>
          )}
        </div>
      </header>

      <main className="feed-page__main thread-detail-main">
        <div className="feed-page__content">
          {loading ? (
            <div className="feed-page__loading">Loading...</div>
          ) : !thread ? (
            <div className="feed-page__empty">Thread not found.</div>
          ) : (
            <>
              {/* Thread card */}
              <div className={`thread-detail${flashRemaining ? " thread-detail--flash" : ""}`}>
                <div className="thread-detail__votes">
                  <button
                    className={[
                      "post-card__vote-btn",
                      vote === "up" ? "post-card__vote-btn--up" : "",
                      !canVote ? "post-card__vote-btn--disabled" : "",
                    ].join(" ")}
                    onClick={() => handleVote(vote === "up" ? null : "up")}
                    disabled={!canVote}
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
                    onClick={() => handleVote(vote === "down" ? null : "down")}
                    disabled={!canVote}
                  >
                    ▼
                  </button>
                </div>

                <div className="thread-detail__body">
                  {flashRemaining && (
                    <div className="thread-detail__flash-bar">
                      <span className="post-card__flash-banner">
                        <span className="post-card__flash-dot" />
                        <span>Flash Thread</span>
                      </span>
                      <span className="thread-detail__flash-timer">
                        {flashRemaining === "Expired" ? "Expired" : `${flashRemaining} remaining`}
                      </span>
                    </div>
                  )}
                  <div className="post-card__meta">
                    <Link to={`/c/${thread.communityId}`} className="post-card__community">
                      c/{thread.communityId}
                    </Link>
                    <span> @{thread.authorName} • {formatFirestoreDay(thread.createdAt)}</span>
                  </div>
                  <h1 className="thread-detail__title">{thread.title}</h1>
                  <p className="thread-detail__text">{thread.body}</p>
                  <div className="post-card__tags">
                    {thread.tags?.map((t) => (
                      <span key={t} className="post-card__tag">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comment form */}
              {fbUser && canWrite && (
                <form onSubmit={handleSubmitComment} className="comment-form">
                  <textarea
                    className="comment-form__input"
                    placeholder="Write a comment..."
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    required
                  />
                  <div className="comment-form__actions">
                    <button
                      type="submit"
                      className="feed-page__btn feed-page__btn--filled"
                      disabled={submitting || !commentBody.trim()}
                    >
                      {submitting ? "Posting..." : "Comment"}
                    </button>
                  </div>
                </form>
              )}
              {fbUser && !canWrite && (
                <div className="comment-form">
                  <p className="comments-section__empty">
                    Your account is read-only. Confirm a student email to write comments.
                  </p>
                </div>
              )}

              {error && <p className="feed-page__error">{error}</p>}

              {/* Comments list */}
              <div className="comments-section">
                <h2 className="comments-section__heading">
                  {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
                </h2>

                {comments.length === 0 ? (
                  <p className="comments-section__empty">No comments yet. Be the first to reply!</p>
                ) : (
                  <div className="comments-list">
                    {comments.map((c) => (
                      <CommentItem
                        key={c.id}
                        comment={c}
                        threadId={threadId!}
                        onFlagged={() => setComments((prev) => prev.filter((p) => p.id !== c.id))}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
