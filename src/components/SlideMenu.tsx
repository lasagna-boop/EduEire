import { useState } from "react";

export default function SlideMenu() {
  const [open, setOpen] = useState(false);

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

      {/* Overlay */}
      <div
        className={`slide-menu__overlay ${open ? "slide-menu__overlay--visible" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Panel */}
      <aside className={`slide-menu__panel ${open ? "slide-menu__panel--open" : ""}`}>
        <div className="slide-menu__header">
          <button
            type="button"
            className="slide-menu__close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <nav className="slide-menu__nav">
          <button type="button" className="slide-menu__item">
            —
          </button>
          <button type="button" className="slide-menu__item">
            —
          </button>
          <button type="button" className="slide-menu__item">
            —
          </button>
        </nav>
      </aside>
    </>
  );
}
