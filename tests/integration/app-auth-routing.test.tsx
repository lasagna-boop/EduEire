import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "../../src/App";
import { AuthContext, type AuthCtx } from "../../src/context/auth-context";
import { ThemeProvider } from "../../src/context/ThemeProvider";

function renderAppAt(path: string, auth: Partial<AuthCtx>) {
  const value: AuthCtx = {
    user: null,
    loading: false,
    accessMode: "read_only",
    studentEmailConfirmed: false,
    canWrite: false,
    ...auth,
  };

  return render(
    <ThemeProvider>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}


 //Integration-level checks of React Router + auth gate +real route tree (no browser).
 //isolated unit tests and Playwright e2e (Chromium).
describe("App routing with mocked auth", () => {
  it("sends unauthenticated users away from /feed to the login screen", async () => {
    renderAppAt("/feed", { user: null, loading: false });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /^Log In$/i })
      ).toBeInTheDocument();
    });
  });

  it("renders the landing page at / without requiring a session", async () => {
    renderAppAt("/", { user: null, loading: false });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: /Ireland.*students|connect/i })
      ).toBeInTheDocument();
    });
  });
});
