import { useEffect, useState } from "react";

type Vote = "up" | "down" | null;

type Post = {
  id: string;
  title: string;
  body: string;
  university: string;
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
  const [score, setScore] = useState(post.score ?? 0);
  const [vote, setVote] = useState<Vote>(null);

  const canVote = !!user;

  // If user logs out, reset local vote state
  useEffect(() => {
    if (!user) {
      setVote(null);
      setScore(post.score ?? 0);
    }
  }, [user, post.score]);

  const handleUpvote = () => {
    if (!canVote) return;

    if (vote === "up") {
      setScore((s) => s - 1);
      setVote(null);
    } else if (vote === "down") {
      setScore((s) => s + 2);
      setVote("up");
    } else {
      setScore((s) => s + 1);
      setVote("up");
    }
  };

  const handleDownvote = () => {
    if (!canVote) return;

    if (vote === "down") {
      setScore((s) => s + 1);
      setVote(null);
    } else if (vote === "up") {
      setScore((s) => s - 2);
      setVote("down");
    } else {
      setScore((s) => s - 1);
      setVote("down");
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
          {post.university} • @{post.author} • {post.createdAt}
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