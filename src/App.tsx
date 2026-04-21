import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import { LegacyUserProfileRedirect } from "./components/LegacyUserProfileRedirect";
import UserProfile from "./pages/UserProfile";
import ThreadDetail from "./pages/ThreadDetail";
import Admin from "./pages/Admin";
import SpamFilterLab from "./pages/SpamFilterLab";
import Flairs from "./pages/Flairs";
import MapPage from "./pages/Map";
import UniversityWebsites from "./pages/UniversityWebsites";
import Guidelines from "./pages/Guidelines";
import ModeratorTeam from "./pages/ModeratorTeam";
import { useAuth } from "./context/useAuth";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "linear-gradient(165deg, #f7faf8, #eef4f0)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid #e2e8f0",
            borderTopColor: "#2d6a4f",
            animation: "edu-app-spin 0.75s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>Loading EduÉire…</p>
      </div>
    );
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
        path="/user/:userId"
        element={user ? <LegacyUserProfileRedirect /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/u/:profileKey"
        element={user ? <UserProfile /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin"
        element={user ? <Admin /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin/spam-lab"
        element={user ? <SpamFilterLab /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/flairs"
        element={user ? <Flairs /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/map"
        element={user ? <MapPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/universities"
        element={user ? <UniversityWebsites /> : <Navigate to="/login" replace />}
      />
      <Route path="/guidelines" element={<Guidelines />} />
      <Route path="/moderator-team" element={<ModeratorTeam />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}