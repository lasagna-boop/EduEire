import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { logout } from "../lib/auth";
import SlideMenu from "./SlideMenu";
import ThemeToggle from "./ThemeToggle";
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

export default function AppHeader({ activeTopLink, search }: Readonly<AppHeaderProps>) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
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
            <img src="/logo.svg" alt="EduÉire" className="landing__logo-img" />
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
          <div className="landing__header-spacer" aria-hidden="true" />
        )}

        <div className="landing__header-tools">
          <ThemeToggle />
        </div>

        <div className="landing__auth">
          {user ? (
            <>
              <Link to="/feed" className="landing__btn landing__btn--ghost">
                My Feed
              </Link>
              <Link to="/profile" className="landing__btn landing__btn--ghost">
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="landing__btn landing__btn--filled landing__btn--logout-header"
                type="button"
              >
                Log Out
              </button>
              <Link
                to="/profile"
                className="landing__btn landing__btn--filled landing__btn--mobile-profile"
              >
                My Profile
              </Link>
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
