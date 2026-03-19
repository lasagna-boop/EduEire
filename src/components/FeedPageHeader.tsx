import { Link } from "react-router-dom";
import SlideMenu from "./SlideMenu";

export type FeedPageHeaderSearch = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

type Props = {
  search?: FeedPageHeaderSearch;
  actions?: React.ReactNode;
};

export function FeedPageHeader({ search, actions }: Readonly<Props>) {
  return (
    <header className="feed-page__header">
      <SlideMenu />
      <Link to="/" className="feed-page__logo">
        <img src="/logo.png" alt="EduÉire" className="feed-page__logo-img" />
      </Link>
      {search ? (
        <form className="feed-page__search" onSubmit={(e) => e.preventDefault()}>
          <span className="feed-page__search-icon">🔍</span>
          <input
            type="text"
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="feed-page__search-input"
          />
        </form>
      ) : (
        <div className="feed-page__search" style={{ flex: 1 }} />
      )}
      <div className="feed-page__actions">{actions}</div>
    </header>
  );
}
