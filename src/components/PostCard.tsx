import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserVote, voteOnThread, isAdmin, setModerationStatus, type Vote } from "../lib/firestore";
import type { PostCardPost } from "../types/postCard";

export default function PostCard({ post }: { post: PostCardPost }) {
  const { user: fbUser } = useAuth();
  
  const [score, setScore] = useState(post.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [flagged, setFlagged] = useState(false);

  const canVote = !!fbUser;

  useEffect(() => {
    if (fbUser) {
      getUserVote(post.id, fbUser.uid)
        .then(setVote)
        .catch((e) => console.error("Failed to get vote", e));
      isAdmin(fbUser.uid).then(setAdmin);
    } else {
      setVote(null);
    }
  }, [fbUser, post.id]);

  const handleFlag = async () => {
    if (!admin || flagged) return;
    try {
      await setModerationStatus(`threads/${post.id}`, "pending_review");
      setFlagged(true);
    } catch (e) {
      console.error("Failed to flag thread", e);
    }
  };

  // update score when post changes
  useEffect(() => {
    setScore(post.score ?? 0);
  }, [post.score]);

  const handleVote = async (newVote: Vote) => {
    if (!canVote || !fbUser || voting) return;

    const oldVote = vote;
    const oldScore = score;

    // optimistic update
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
      await voteOnThread(post.id, fbUser.uid, newVote);
    } catch (e) {
      console.error("Failed to vote", e);
      // revert on error
      setVote(oldVote);
      setScore(oldScore);
    } finally {
      setVoting(false);
    }
  };

  const handleUpvote = () => {
    if (vote === "up") {
      handleVote(null);
    } else {
      handleVote("up");
    }
  };

  const handleDownvote = () => {
    if (vote === "down") {
      handleVote(null);
    } else {
      handleVote("down");
    }
  };

  return (
    <div className={`post-card${post.isFlash ? " post-card--flash" : ""}`}>
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
        {post.isFlash && (
          <div className="post-card__flash-banner">
            <span className="post-card__flash-dot" />
            <span>Flash Thread</span>
          </div>
        )}
        <div className="post-card__meta">
          <Link to={`/c/${post.communityId}`} className="post-card__community">
            c/{post.communityId}
          </Link>
          <span>@{post.author} • {post.createdAt}</span>
        </div>

        <Link to={`/thread/${post.id}`} className="post-card__title-link">
          <h3 className="post-card__title">{post.title}</h3>
        </Link>
        <p className="post-card__body">{post.body}</p>

        <div className="post-card__tags">
          {post.tags.map((t) => (
            <span key={t} className="post-card__tag">
              #{t}
            </span>
          ))}
        </div>

        <div className="post-card__footer">
          <Link to={`/thread/${post.id}`} className="post-card__comments-link">
            💬 {post.postCount ?? 0} {(post.postCount ?? 0) === 1 ? "Comment" : "Comments"}
          </Link>
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