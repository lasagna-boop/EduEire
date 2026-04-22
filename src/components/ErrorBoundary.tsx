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
        <div role="alert" className="app-error-boundary">
          <p className="app-error-boundary__brand">EDUÉIRE</p>
          <h1 className="app-error-boundary__title">Something went wrong</h1>
          <p className="app-error-boundary__copy">
            Refresh the page to continue. If this keeps happening, try again in a moment.
          </p>
          <button type="button" className="app-error-boundary__btn" onClick={() => globalThis.location.reload()}>
            Reload
          </button>
          {import.meta.env.DEV && this.state.error ? (
            <pre className="app-error-boundary__pre">{this.state.error.message}</pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}
