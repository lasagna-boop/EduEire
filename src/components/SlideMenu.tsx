import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listCommunities } from "../lib/firestore";

export default function SlideMenu() {
  const [open, setOpen] = useState(false);
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    listCommunities()
      .then((list) => setCommunities(list.map((c) => ({ id: c.id, name: c.name }))))
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

      <div
        className={`slide-menu__overlay ${open ? "slide-menu__overlay--visible" : ""}`}
        onClick={close}
        aria-hidden={!open}
      />

      <aside className={`slide-menu__panel ${open ? "slide-menu__panel--open" : ""}`}>
        <div className="slide-menu__header">
          <button type="button" className="slide-menu__close" onClick={close} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className="slide-menu__nav">
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
