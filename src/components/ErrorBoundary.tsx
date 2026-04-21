import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

/**
 * Prevents a single render error from blanking the whole booth demo; offers reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("EduÉire UI error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            boxSizing: "border-box",
            padding: "clamp(1.5rem, 4vw, 2.5rem)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: "system-ui, sans-serif",
            background: "linear-gradient(160deg, #f7faf8 0%, #f0f4f2 100%)",
            color: "#1a202c",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", color: "#2d6a4f" }}>
            EDUÉIRE
          </p>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, maxWidth: "32ch", fontSize: "0.95rem", lineHeight: 1.5, color: "#4a5568" }}>
            Refresh the page to continue. If this keeps happening, try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "0.5rem",
              padding: "0.65rem 1.25rem",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              background: "#2d6a4f",
              color: "#fff",
            }}
          >
            Reload
          </button>
          {import.meta.env.DEV && this.state.error ? (
            <pre
              style={{
                marginTop: "1rem",
                maxWidth: "100%",
                overflow: "auto",
                textAlign: "left",
                fontSize: "0.7rem",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "rgba(0,0,0,0.06)",
              }}
            >
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}
