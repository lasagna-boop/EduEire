// simple sidebar navigation + auth state display
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";

export default function Navbar() {
  const { user, loading } = useAuth();

  // handles sign out via firebase auth wrapper
  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <div className="sidebar">
      <h4>EduEire</h4>

      <nav className="sidebar__nav">
        <Link to="/">Landing</Link>
        <Link to="/feed">Feed</Link>
        {/* only show login link if user is not authenticated */}
        {!user && <Link to="/login">Login</Link>}
      </nav>

      <div className="sidebar__auth">
        {loading ? (
          // firebase still restoring session
          <div className="sidebar__user">Checking session…</div>
        ) : user ? (
          <>
            <div className="sidebar__user">
              Signed in as @{user.displayName || user.email}
            </div>
            <button className="sidebar__auth-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <div className="sidebar__user">Not signed in</div>
        )}
      </div>
    </div>
  );
}