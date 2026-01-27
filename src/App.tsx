import { Routes, Route } from "react-router-dom"; //define which component is rendered
import Navbar from "./components/Navbar"; //Navvar always visible for now 
//page components (SPA pages, not HTML everytime)
import Landing from "./pages/Landing"; //
import Login from "./pages/Login";
import Feed from "./pages/Feed"; 
import { useState } from "react";

type User = { name: string };

export default function App() {
  // Mock auth state (later replaced by Firebase Auth)
  const [user, setUser] = useState<User | null>(null);

  const login = () => setUser({ name: "stevie" });
  const logout = () => setUser(null);

  return (
    <div className="app-layout">
      <Navbar user={user} onLogin={login} onLogout={logout} />

      <div className="page-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<Feed user={user} />} />
          <Route path="/login" element={<Login user={user} onLogin={login} />} />
        </Routes>
      </div>
    </div>
  );
}