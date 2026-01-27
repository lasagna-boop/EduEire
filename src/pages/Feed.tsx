import PostCard from "../components/PostCard";

type Post = {
  id: string;
  title: string;
  body: string;
  university: string;
  tags: string[];
  author: string;
  createdAt: string; // keep simple for now
  score? : number ; 
};

const MOCK_POSTS: Post[] = [
  {
    id: "1",
    title: "How do you survive TU Dublin CA exams?",
    body: "Any tips/resources/past papers that helped you? Trying to build a decent revision plan.",
    university: "TU Dublin",
    tags: ["exams", "computer-architecture", "tips"],
    author: "anon", 
    createdAt: "2026-01-27",
    score : 12 ,
  },
  {
    id: "2",
    title: "Best places to study in UCD after 6pm?",
    body: "Looking for quiet spots + sockets. Library gets packed.",
    university: "UCD",
    tags: ["study", "campus"],
    author: "mary",
    createdAt: "2026-01-25",
    score : 9,
  },
  {
    id: "3",
    title: "Any good NLP resources for beginners?",
    body: "I’m comfortable with Python but new to NLP. Prefer practical tutorials over theory.",
    university: "TCD",
    tags: ["nlp", "resources", "python"],
    author: "stevie",
    createdAt: "2026-01-22",
  },
];

export default function Feed() {
  return (
    <div className="feed">
      <h2 className="feed__title">Feed</h2>

      <div className="feed__list">
        {MOCK_POSTS.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}