// src/pages/Login.tsx
// login/register page using firebase auth helpers

import { useState } from "react";
import { login, register } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user } = useAuth();

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // toggle between login and register mode
  const [isRegister, setIsRegister] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // handles both login and register submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (isRegister) {
        // create new account
        await register(email.trim(), password, displayName.trim());
      } else {
        // sign into existing account
        await login(email.trim(), password);
      }
    } catch (err: any) {
      // show firebase error message (for now just raw message)
      setError(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 420 }}>
      <h2>{isRegister ? "Register" : "Login"}</h2>

      {user ? (
        // if already logged in, show simple message
        <p>
          You are already logged in as <b>{user.displayName || user.email}</b>.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
          {isRegister && (
            <input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          )}

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />

          <input
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />

          {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Login"}
          </button>

          <button
            type="button"
            onClick={() => setIsRegister((v) => !v)}
            disabled={busy}
          >
            Switch to {isRegister ? "Login" : "Register"}
          </button>
        </form>
      )}
    </div>
  );
}