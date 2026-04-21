import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { logout } from "../lib/auth";
import { listCommunities } from "../lib/firestore";
import { formatCommunityHandle } from "../lib/communityDisplay";

export default function SlideMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [communities, setCommunities] = useState<{ id: string }[]>([]);

  useEffect(() => {
    listCommunities()
      .then((list) => setCommunities(list.map((c) => ({ id: c.id }))))
      .catch((e) => console.error("Failed to load communities", e));
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      close();
    }
  };

  const sheet = open ? (
    <>
      {/* Full-viewport scrim: div (not button) so size/position are reliable across browsers */}
      <div
        className={`slide-menu__overlay ${open ? "slide-menu__overlay--visible" : ""}`}
        onClick={close}
        role="presentation"
        aria-hidden="true"
      />

      <aside
        className={`slide-menu__panel ${open ? "slide-menu__panel--open" : ""}`}
        aria-hidden={!open}
      >
        <div className="slide-menu__header">
          <button type="button" className="slide-menu__close" onClick={close} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className="slide-menu__nav">
          <h3 className="slide-menu__title">Main</h3>
          <Link
            to="/feed"
            className="slide-menu__item slide-menu__item--link"
            onClick={close}
          >
            Home feed
          </Link>
          <Link
            to="/map"
            className="slide-menu__item slide-menu__item--link"
            onClick={close}
          >
            Campus map
          </Link>
          <h3 className="slide-menu__title">More</h3>
          <Link
            to="/flairs"
            className="slide-menu__item slide-menu__item--link"
            onClick={close}
          >
            Topic tags (Flairs)
          </Link>
          <Link
            to="/universities"
            className="slide-menu__item slide-menu__item--link"
            onClick={close}
          >
            University Explorer
          </Link>
          <h3 className="slide-menu__title">Communities</h3>
          {communities.map((c) => (
            <Link
              key={c.id}
              to={`/c/${c.id}`}
              className="slide-menu__item slide-menu__item--link"
              onClick={close}
            >
              {formatCommunityHandle(c.id)}
            </Link>
          ))}
        </nav>

        {user ? (
          <div className="slide-menu__footer">
            <button
              type="button"
              className="slide-menu__item slide-menu__item--logout"
              onClick={() => void handleLogout()}
            >
              Log out
            </button>
          </div>
        ) : null}
      </aside>
    </>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="slide-menu__trigger"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <img src="/menu-icon.png" alt="" className="slide-menu__icon" />
      </button>

      {typeof document !== "undefined" && sheet ? createPortal(sheet, document.body) : null}
    </>
  );
}
