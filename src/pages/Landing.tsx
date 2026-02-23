import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";
import SlideMenu from "../components/SlideMenu";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/feed?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <div className="landing">
      {/* Top Header Bar - Reddit Style */}
      <header className="landing__header">
        <SlideMenu />
        <Link to="/" className="landing__logo">
          <img src="/logo.png" alt="EduÉire" className="landing__logo-img" />
        </Link>

        <form className="landing__search" onSubmit={handleSearch}>
          <span className="landing__search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search EduÉire"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="landing__search-input"
          />
        </form>

        <div className="landing__auth">
          {user ? (
            <>
              <Link to="/feed" className="landing__btn landing__btn--outline">
                My Feed
              </Link>
              <button onClick={handleLogout} className="landing__btn landing__btn--filled">
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="landing__btn landing__btn--outline">
                Log In
              </Link>
              <Link to="/login?mode=signup" className="landing__btn landing__btn--filled">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="landing__main">
        {/* Hero with Video */}
        <section className="landing__hero">
          <div className="landing__hero-video">
            <video autoPlay loop muted playsInline>
              <source src="/TestLogo.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="landing__hero-text">
            <h1>Ireland's Education Community</h1>
            <p>Join thousands of students and educators sharing knowledge, resources, and support.</p>
            <Link to="/feed" className="landing__btn landing__btn--large">
              Browse Feed
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="landing__features">
          <div className="landing__feature">
            <span className="landing__feature-icon">📚</span>
            <div>
              <h3>Share Knowledge</h3>
              <p>Post study tips, resources, and educational content</p>
            </div>
          </div>
          <div className="landing__feature">
            <span className="landing__feature-icon">🤝</span>
            <div>
              <h3>Connect</h3>
              <p>Network with students and educators across Ireland</p>
            </div>
          </div>
          <div className="landing__feature">
            <span className="landing__feature-icon">💬</span>
            <div>
              <h3>Discuss</h3>
              <p>Engage in conversations about education topics</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}