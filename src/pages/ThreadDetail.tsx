import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FeedPageHeader } from "../components/FeedPageHeader";
import { ThreadDetailBody } from "../components/ThreadDetailBody";
import {
  getThread,
  listPosts,
  addPost,
  getUserVote,
  voteOnThread,
  type Thread,
  type Post,
  type Vote,
} from "../lib/firestore";
import { useAuth } from "../context/useAuth";
import { errorMessage } from "../lib/errors";
import { useLogout } from "../hooks/useLogout";
import { isApprovedPost } from "../lib/postModeration";
import { moderateContent } from "../lib/moderation";
import { hasReadOnlyAllowedTag } from "../lib/sectionAccess";
import { voteScoreDelta } from "../lib/voteScoreDelta";

export default function ThreadDetail() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user: fbUser, canWrite, accessMode } = useAuth();
  const handleLogout = useLogout();

  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const canVote = fbUser !== null;
  const canCommentInThread =
    canWrite || (accessMode === "read_only" && hasReadOnlyAllowedTag(thread?.tags));

  const load = async () => {
    if (threadId === undefined || threadId === "") return;
    setLoading(true);
    try {
      const [t, posts] = await Promise.all([
        getThread(threadId),
        listPosts(threadId),
      ]);
      setThread(t);
      setComments(posts.filter(isApprovedPost));
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
    if (canVote === false || fbUser === null || voting || threadId === undefined) return;
    const oldVote = vote;
    const oldScore = score;
    const scoreChange = voteScoreDelta(oldVote, newVote);

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
    if (
      fbUser === null ||
      threadId === undefined ||
      commentBody.trim() === "" ||
      canCommentInThread === false
    )
      return;

    setSubmitting(true);
    setError(null);

    const modResult = moderateContent("", commentBody.trim());
    if (modResult.flagged) {
      setError("Your comment looks like spam or contains inappropriate language.");
      setSubmitting(false);
      return;
    }

    try {
      await addPost(threadId, {
        body: commentBody.trim(),
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
        toxicityScore: modResult.toxicityScore ?? 0,
        spamScore: modResult.spamScore ?? 0,
      });
      setCommentBody("");
      const posts = await listPosts(threadId);
      setComments(posts.filter(isApprovedPost));
    } catch (e) {
      setError(errorMessage(e) || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentPostId: string, body: string) => {
    if (
      fbUser === null ||
      threadId === undefined ||
      body.trim() === "" ||
      canCommentInThread === false
    )
      return;

    const modResult = moderateContent("", body.trim());
    if (modResult.flagged) {
      setError("Your reply looks like spam or contains inappropriate language.");
      throw new Error("moderation");
    }

    setSubmitting(true);
    setError(null);
    try {
      await addPost(threadId, {
        body: body.trim(),
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
        toxicityScore: modResult.toxicityScore ?? 0,
        spamScore: modResult.spamScore ?? 0,
        parentPostId,
      });
      const posts = await listPosts(threadId);
      setComments(posts.filter(isApprovedPost));
    } catch (e) {
      if ((e as Error).message !== "moderation") {
        setError(errorMessage(e) || "Failed to add reply");
      }
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentFlagged = (commentId: string) => {
    setComments((prev) => prev.filter((p) => p.id !== commentId));
  };

  let mainContent: React.ReactNode;
  if (thread === null) {
    mainContent = loading ? (
      <div className="feed-page__loading">Loading...</div>
    ) : (
      <div className="feed-page__empty">Thread not found.</div>
    );
  } else {
    mainContent = (
      <ThreadDetailBody
        key={thread.id}
        thread={thread}
        threadId={threadId ?? ""}
        score={score}
        vote={vote}
        canVote={canVote}
        onVote={handleVote}
        fbUser={fbUser}
        canComment={canCommentInThread}
        isFetching={loading}
        commentBody={commentBody}
        onCommentBodyChange={setCommentBody}
        onSubmitComment={handleSubmitComment}
        submitting={submitting}
        error={error}
        comments={comments}
        onCommentFlagged={handleCommentFlagged}
        onReplySubmit={handleReplySubmit}
      />
    );
  }

  return (
    <div className="feed-page">
      <FeedPageHeader
        actions={
          fbUser ? (
            <>
              <Link to="/feed" className="feed-page__btn feed-page__btn--outline">
                Feed
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="feed-page__btn feed-page__btn--outline"
              >
                Log Out
              </button>
            </>
          ) : null
        }
      />

      <main className="feed-page__main thread-detail-main">
        <div className="feed-page__content">{mainContent}</div>
      </main>
    </div>
  );
}
