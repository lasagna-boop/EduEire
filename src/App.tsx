import { Routes, Route } from "react-router-dom"; //define which component is rendered
import Navbar from "./components/Navbar"; //Navvar always visible for now 
//page components (SPA pages, not HTML everytime)
import Landing from "./pages/Landing"; //
import Login from "./pages/Login";
import Feed from "./pages/Feed"; 

export default function App() {
  return (
    <div className="app-layout">
      <Navbar />

      <div className="page-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/feed" element={<Feed />} />
        </Routes>
      </div>
    </div>
  );
}