import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listCommunities } from "../lib/firestore";

export default function SlideMenu() {
  const [open, setOpen] = useState(false);
  const [communities, setCommunities] = useState<{ id: string }[]>([]);

  useEffect(() => {
    listCommunities()
      .then((list) => setCommunities(list.map((c) => ({ id: c.id }))))
      .catch((e) => console.error("Failed to load communities", e));
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="slide-menu__trigger"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <img src="/menu-icon.png" alt="" className="slide-menu__icon" />
      </button>

      <button
        type="button"
        className={`slide-menu__overlay ${open ? "slide-menu__overlay--visible" : ""}`}
        onClick={close}
        aria-label="Close menu"
        aria-hidden={!open}
        tabIndex={-1}
      />

      <aside className={`slide-menu__panel ${open ? "slide-menu__panel--open" : ""}`}>
        <div className="slide-menu__header">
          <button type="button" className="slide-menu__close" onClick={close} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className="slide-menu__nav">
          <Link
            to="/flairs"
            className="slide-menu__item slide-menu__item--link"
            onClick={close}
          >
            Flair Topics
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
              c/{c.id}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
