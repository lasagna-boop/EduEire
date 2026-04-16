import { lazy, Suspense, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { login, register } from "../lib/auth";
import { errorMessage } from "../lib/errors";
import { useAuth } from "../context/useAuth";
import { STUDENT_EMAIL_DOMAINS } from "../lib/userAccess";
import AppHeader from "../components/AppHeader";

const LandingHeroShader = lazy(() => import("../components/LandingHeroShader"));

export default function Login() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Single source of truth with header links: `/login` vs `/login?mode=signup` */
  const isRegister = searchParams.get("mode") === "signup";

  const toggleAuthMode = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get("mode") === "signup") {
          next.delete("mode");
        } else {
          next.set("mode", "signup");
        }
        return next;
      },
      { replace: true }
    );
    setError(null);
  };

  useEffect(() => {
    setError(null);
  }, [isRegister]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    } catch (err) {
      setError(errorMessage(err) || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div
        className={`login-page__bg${prefersReducedMotion ? " login-page__bg--static" : ""}`}
        aria-hidden
      >
        {!prefersReducedMotion ? (
          <>
            <div className="login-page__shader">
              <Suspense fallback={null}>
                <LandingHeroShader />
              </Suspense>
            </div>
            <div className="login-page__scrim" />
          </>
        ) : null}
      </div>

      <div className="login-page__chrome">
        <AppHeader activeTopLink="communities" />

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
            <p className="login-page__subtitle login-page__subtitle--domains" style={{ marginTop: 8 }}>
              {STUDENT_EMAIL_DOMAINS.length} recognised Irish university domains unlock full posting (e.g. @tcd.ie,
              @ucdconnect.ie, @ucc.ie, @dcu.ie, @studentmail.ul.ie). Other emails stay read-only.
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
                onClick={() => toggleAuthMode()}
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
    </div>
  );
}