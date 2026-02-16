import { useEffect, useState } from "react";
import PostCard from "../components/PostCard";
import { createThread, listThreads } from "../lib/firestore";
import { useAuth } from "../context/AuthContext";

type UserLite = { name: string } | null;

// shape that PostCard expects right now
type PostCardPost = {
  id: string;
  title: string;
  body: string;
  university: string;
  tags: string[];
  author: string;
  createdAt: string;
  score?: number;
};

function formatCreatedAt(createdAt: any): string {
  // firestore Timestamp -> date string (yyyy-mm-dd)
  try {
    if (createdAt?.toDate) return createdAt.toDate().toISOString().slice(0, 10);
  } catch {}
  return "just now";
}

export default function Feed({ user }: { user: UserLite }) {
  const { user: fbUser } = useAuth();

  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // new thread form
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [university, setUniversity] = useState("TU Dublin");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);

    try {
      const { threads } = await listThreads({ pageSize: 30 });

      const mapped: PostCardPost[] = threads.map((t: any) => ({
        id: t.id,
        title: t.title,
        body: t.body ?? "",
        university: t.university ?? "",
        tags: Array.isArray(t.tags) ? t.tags : [],
        author: t.authorName || "anon",
        createdAt: formatCreatedAt(t.createdAt),
        score: t.score ?? 0,
      }));

      setPosts(mapped);
    } catch (e: any) {
      setError(e?.message ?? "failed to load threads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;

    setBusy(true);
    setError(null);

    try {
      const tagList = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createThread({
        title: title.trim(),
        body: body.trim(),
        university: university.trim(),
        tags: tagList,
        authorId: fbUser.uid,
        authorName: fbUser.displayName || fbUser.email || "user",
      });

      setTitle("");
      setBody("");
      setTags("");
      setShowNew(false);

      await load();
    } catch (e: any) {
      setError(e?.message ?? "failed to create thread");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="feed">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 className="feed__title" style={{ margin: 0 }}>
          Feed
        </h2>

        {fbUser && (
          <button type="button" onClick={() => setShowNew((v) => !v)} disabled={busy}>
            {showNew ? "Close" : "New thread"}
          </button>
        )}
      </div>

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}

      {showNew && fbUser && (
        <form
          onSubmit={handleCreate}
          style={{ display: "grid", gap: 10, marginTop: 14, maxWidth: 720 }}
        >
          <input
            placeholder="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            placeholder="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
          />

          <input
            placeholder="university"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            required
          />

          <input
            placeholder="tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          <button type="submit" disabled={busy}>
            {busy ? "Posting…" : "Post"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ marginTop: 16 }}>Loading…</p>
      ) : (
        <div className="feed__list" style={{ marginTop: 16 }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}