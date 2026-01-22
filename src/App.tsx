import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

export default function App() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Navbar />

      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </div>
  );
}