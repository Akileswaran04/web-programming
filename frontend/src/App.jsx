import { Routes, Route, Navigate, Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { Toasts } from "./effects.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MaterialsPage from "./pages/MaterialsPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import MyUploadsPage from "./pages/MyUploadsPage.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="7" y="4" width="18" height="23" rx="2" fill="#fffdf8" stroke="currentColor" strokeWidth="1.6" transform="rotate(-8 16 16)" />
            <rect x="7" y="5" width="18" height="23" rx="2" fill="#fffdf8" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 12h10M11 16h10M11 20h6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>Study&nbsp;Material <em>Portal</em></span>
        </Link>
        <nav>
          <NavLink to="/materials">Browse</NavLink>
          {user && <NavLink to="/upload">Upload</NavLink>}
          {user && <NavLink to="/my-uploads">My shelf</NavLink>}
        </nav>
        <div className="who">
          {user ? (
            <>
              <span className="avatar" title={user.email}>{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="who-name">{user.name}</span>
              <button className="btn ghost sm" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/register" className="btn sm">Join</Link>
            </>
          )}
        </div>
      </header>
      <main key={location.pathname} className="page">
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/upload" element={<Protected><UploadPage /></Protected>} />
          <Route path="/my-uploads" element={<Protected><MyUploadsPage /></Protected>} />
        </Routes>
      </main>
      <footer className="foot">Only share material you have permission to share · PDF up to 10 MB</footer>
      <Toasts />
    </>
  );
}
