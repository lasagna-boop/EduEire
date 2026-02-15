// main app shell: handles routing + auth gating

import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Feed from "./pages/Feed";

import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

  // temporary adapter: feed currently expects { name: string } | null
  // later we can refactor feed to use firebase User directly
  const appUser = user
    ? { name: user.displayName || user.email || "user" }
    : null;

  // block routing until firebase restores auth state
  if (loading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  return (
    <div className="app-layout">
      <Navbar />

      <div className="page-content">
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* protected route: only logged-in users can access feed */}
          <Route
            path="/feed"
            element={user ? <Feed user={appUser} /> : <Navigate to="/login" replace />}
          />

          {/* prevent logged-in users from going back to login */}
          <Route
            path="/login"
            element={user ? <Navigate to="/feed" replace /> : <Login />}
          />

          {/* fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}