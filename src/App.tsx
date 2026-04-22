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
      <div className="app-loading-shell">
        <div className="app-loading-shell__spinner" aria-hidden />
        <p className="app-loading-shell__text">Loading EduÉire…</p>
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