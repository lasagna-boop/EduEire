import { useState } from "react";

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

export default function PostCard({ post }: { post: Post }) {
  const [score, setScore] = useState(post.score ?? 0);
  const [vote, setVote] = useState<Vote> (null) ; 

  const handleUpvote = () => {
    if (vote === "up") {
      // undo upvote
      setScore((s) => s - 1);
      setVote(null);
    } else if (vote === "down") {
      // switch from downvote to upvote
      setScore((s) => s + 2);
      setVote("up");
    } else {
      // first upvote
      setScore((s) => s + 1);
      setVote("up");
    }
  };

  const handleDownvote = () => {
    if (vote === "down") {
      // undo downvote
      setScore((s) => s + 1);
      setVote(null);
    } else if (vote === "up") {
      // switch from upvote to downvote
      setScore((s) => s - 2);
      setVote("down");
    } else {
      // first downvote
      setScore((s) => s - 1);
      setVote("down");
    }
  };

  return (
  <div className="post-card">
    <div className="post-card__votes">
      <button
        className="post-card__vote-btn"
        onClick={handleUpvote}
        aria-label="Upvote"
      >
        ▲
      </button>

      <div className="post-card__score">{score}</div>

      <button
        className="post-card__vote-btn"
        onClick={handleDownvote}
        aria-label="Downvote"
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