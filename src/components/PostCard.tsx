type Post = {
  id: string;
  title: string;
  body: string;
  university: string;
  tags: string[];
  author: string;
  createdAt: string;
};

export default function PostCard({ post }: { post: Post }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "white",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        {post.university} • @{post.author} • {post.createdAt}
      </div>

      <h3 style={{ margin: 0, marginBottom: 8 }}>{post.title}</h3>
      <p style={{ margin: 0, marginBottom: 12, lineHeight: 1.4 }}>{post.body}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {post.tags.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              background: "#f3f4f6",
            }}
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}