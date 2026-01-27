//using link instead of <a> to enable SPA nav
//updates URL without reloading the page
import { Link } from "react-router-dom";

type Props = {
  user: { name: string } | null;
  onLogin: () => void;
  onLogout: () => void;
};

export default function Navbar({ user, onLogin, onLogout }: Props) {
  return (
    <div className="sidebar">
      <h4>EduEire</h4>

      <nav className="sidebar__nav">
        <Link to="/">Landing</Link>
        <Link to="/feed">Feed</Link>
        <Link to="/login">Login page</Link>
      </nav>

      <div className="sidebar__auth">
        {user ? (
          <>
            <div className="sidebar__user">Signed in as @{user.name}</div>
            <button className="sidebar__auth-btn" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <button className="sidebar__auth-btn" onClick={onLogin}>
            Quick Login
          </button>
        )}
      </div>
    </div>
  );
}