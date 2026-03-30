import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { logout } from "../lib/auth";
import SlideMenu from "./SlideMenu";
import "../styles/landing.css";

type HeaderSearchProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

type AppHeaderProps = {
  activeTopLink?: "communities" | "map";
  search?: HeaderSearchProps;
};

export default function AppHeader({ activeTopLink, search }: AppHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <header className="landing__header">
      <div className="landing__header-inner">
        <div className="landing__header-left">
          <SlideMenu />
          <Link to="/" className="landing__logo">
            <img src="/logo.png" alt="EduÉire" className="landing__logo-img" />
          </Link>
          <div className="landing__top-links">
            <Link
              to="/feed"
              className={activeTopLink === "communities" ? "landing__top-link--active" : undefined}
            >
              Communities
            </Link>
            <Link to="/map" className={activeTopLink === "map" ? "landing__top-link--active" : undefined}>
              Map
            </Link>
          </div>
        </div>

        {search ? (
          <form
            className="landing__search"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.onSubmit) {
                search.onSubmit();
                return;
              }
              if (search.value.trim()) {
                navigate(`/feed?q=${encodeURIComponent(search.value.trim())}`);
              }
            }}
          >
            <span className="landing__search-icon">🔍</span>
            <input
              type="text"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="landing__search-input"
            />
          </form>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        <div className="landing__auth">
          {user ? (
            <>
              <Link to="/feed" className="landing__btn landing__btn--ghost">
                My Feed
              </Link>
              <Link to="/profile" className="landing__btn landing__btn--ghost">
                Profile
              </Link>
              <button onClick={handleLogout} className="landing__btn landing__btn--filled" type="button">
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="landing__btn landing__btn--ghost">
                Log In
              </Link>
              <Link to="/login?mode=signup" className="landing__btn landing__btn--filled">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
