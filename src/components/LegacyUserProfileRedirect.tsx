import { Navigate, useParams } from "react-router-dom";

/** Old `/user/:uid` links → `/u/:segment` (handle or uid). */
export function LegacyUserProfileRedirect() {
  const { userId } = useParams<{ userId: string }>();
  return <Navigate to={`/u/${encodeURIComponent(userId ?? "")}`} replace />;
}
