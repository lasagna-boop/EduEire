import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import ThreadDetail from "./pages/ThreadDetail";
import Admin from "./pages/Admin";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

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
        element={user ? <Feed /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/c/:communityId"
        element={user ? <Community /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/thread/:threadId"
        element={user ? <ThreadDetail /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/profile"
        element={user ? <Profile /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin"
        element={user ? <Admin /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}