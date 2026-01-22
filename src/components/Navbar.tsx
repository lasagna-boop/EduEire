import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div
      style={{
        width: 220,
        backgroundColor: "#198754", // bootstrap green
        color: "white",
        padding: 20,
      }}
    >
      <h4>EduEire</h4>

      <nav style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <Link to="/" style={{ color: "white", textDecoration: "none" }}>
          Landing
        </Link>

        <Link to="/login" style={{ color: "white", textDecoration: "none" }}>
          Login
        </Link>
      </nav>
    </div>
  );
}