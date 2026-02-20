import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

  const appUser = user
    ? { name: user.displayName || user.email || "user" }
    : null;

  if (loading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/feed" replace /> : <Login />}
      />
      <Route
        path="/feed"
        element={user ? <Feed user={appUser} /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}