//using link instead of <a> to enable SPA nav
//updates URL without reloading the page
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="sidebar">
      <h4>EduEire</h4>

      <nav className="sidebar__nav">
        <Link to="/">Landing</Link>
        <Link to="/login">Login</Link>
      </nav>
    </div>
  );
}