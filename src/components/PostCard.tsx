import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserVote, voteOnThread, type Vote } from "../lib/firestore";

type Post = {
  id: string;
  title: string;
  body: string;
  communityId: string;
  tags: string[];
  author: string;
  createdAt: string;
  score?: number;
};

export default function PostCard({
  post,
  user,
}: {
  post: Post;
  user: { name: string } | null;
}) {
  const { user: fbUser } = useAuth();
  
  const [score, setScore] = useState(post.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);

  const canVote = !!fbUser;

  // fetch user's existing vote on mount
  useEffect(() => {
    if (fbUser) {
      getUserVote(post.id, fbUser.uid)
        .then(setVote)
        .catch((e) => console.error("Failed to get vote", e));
    } else {
      setVote(null);
    }
  }, [fbUser, post.id]);

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
          <Link to={`/c/${post.communityId}`} className="post-card__community">
            c/{post.communityId}
          </Link>
          {" • "}@{post.author} • {post.createdAt}
        </div>

        <h3 className="post-card__title">{post.title}</h3>
        <p className="post-card__body">{post.body}</p>

        <div className="post-card__tags">
          {post.tags.map((t) => (
            <span key={t} className="post-card__tag">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}