import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { login, register } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import SlideMenu from "../components/SlideMenu";

export default function Login() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  // Open in signup mode when coming from Landing "Sign Up" (?mode=signup)
  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setIsRegister(true);
    }
  }, [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (isRegister) {
        await register(email.trim(), password, displayName.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      {/* Header */}
      <header className="login-page__header">
        <SlideMenu />
        <Link to="/" className="login-page__logo">
          <img src="/logo.png" alt="EduÉire" className="login-page__logo-img" />
        </Link>
      </header>

      {/* Main  */}
      <main className="login-page__main">
        <div className="login-page__card">
          <h1 className="login-page__title">
            {isRegister ? "Create Account" : "Log In"}
          </h1>
          <p className="login-page__subtitle">
            {isRegister
              ? "Join Ireland's education community"
              : "Welcome back to EduÉire"}
          </p>
          {isRegister && (
            <p className="login-page__subtitle" style={{ marginTop: 8 }}>
              Student email domains (@mytudublin.ie, @tcd.ie, @ucdconnect.ie) get full posting access. Other emails are read-only.
            </p>
          )}

          {user ? (
            <p className="login-page__already">
              You're logged in as <b>{user.displayName || user.email}</b>.{" "}
              <Link to="/feed">Go to Feed</Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="login-page__form">
              {isRegister && (
                <input
                  className="login-page__input"
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="nickname"
                />
              )}

              <input
                className="login-page__input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />

              <input
                className="login-page__input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
              />

              {error && <p className="login-page__error">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="login-page__submit"
              >
                {busy
                  ? "Please wait…"
                  : isRegister
                  ? "Create Account"
                  : "Log In"}
              </button>

              <div className="login-page__divider">
                <span>or</span>
              </div>

              <button
                type="button"
                onClick={() => setIsRegister((v) => !v)}
                disabled={busy}
                className="login-page__switch"
              >
                {isRegister
                  ? "Already have an account? Log In"
                  : "New to EduÉire? Sign Up"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}