import { useEffect, useState } from "react";
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
  type Thread,
  type Post,
  type Vote,
} from "../lib/firestore";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";

function formatDate(ts: any): string {
  try {
    if (ts?.toDate) return ts.toDate().toISOString().slice(0, 10);
  } catch {}
  return "just now";
}

function timeAgo(ts: any): string {
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return date.toISOString().slice(0, 10);
  } catch {
    return "just now";
  }
}

function CommentItem({ comment, threadId }: { comment: Post; threadId: string }) {
  const { user: fbUser } = useAuth();
  const [score, setScore] = useState(comment.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const canVote = !!fbUser;

  useEffect(() => {
    if (fbUser) {
      getCommentVote(threadId, comment.id, fbUser.uid)
        .then(setVote)
        .catch((e) => console.error("Failed to get comment vote", e));
    }
  }, [fbUser, threadId, comment.id]);

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
          <span className="comment__time">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="comment__text">{comment.body}</p>
      </div>
    </div>
  );
}

export default function ThreadDetail() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user: fbUser } = useAuth();

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

  const load = async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const [t, posts] = await Promise.all([
        getThread(threadId),
        listPosts(threadId),
      ]);
      setThread(t);
      setComments(posts);
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
    if (!fbUser || !threadId || !commentBody.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await addPost(threadId, {
        body: commentBody.trim(),
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
      });
      setCommentBody("");
      const posts = await listPosts(threadId);
      setComments(posts);
    } catch (e: any) {
      setError(e?.message ?? "Failed to add comment");
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
              <div className="thread-detail">
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
                  <div className="post-card__meta">
                    <Link to={`/c/${thread.communityId}`} className="post-card__community">
                      c/{thread.communityId}
                    </Link>
                    {" • "}@{thread.authorName} • {formatDate(thread.createdAt)}
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
              {fbUser && (
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
                      <CommentItem key={c.id} comment={c} threadId={threadId!} />
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
