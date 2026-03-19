import { Link } from "react-router-dom";

type CommunityRef = { id: string };

type Props = {
  communities: CommunityRef[];
  /** When set, highlights the active community link */
  activeCommunityId?: string;
};

export function CommunitiesSidebar({ communities, activeCommunityId }: Readonly<Props>) {
  return (
    <aside className="feed-page__left-sidebar">
      <div className="feed-page__sidebar-card">
        <h3>Communities</h3>
        <ul className="feed-page__community-list">
          {communities.map((c) => (
            <li key={c.id}>
              <Link
                to={`/c/${c.id}`}
                className={[
                  "feed-page__community-link",
                  activeCommunityId && c.id === activeCommunityId
                    ? "feed-page__community-link--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="feed-page__community-icon">🎓</span>
                <span className="feed-page__community-name">c/{c.id}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
