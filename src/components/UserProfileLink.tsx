import { Link } from "react-router-dom";

type Props = {
  /** `publicHandle` or Firebase uid for /u/... */
  profileKey: string | undefined | null;
  /** Display name without @ */
  label: string;
  className?: string;
  /** Thread author posted anonymously */
  anonymous?: boolean;
  /** Only when true is the real author revealed for anonymous threads */
  viewerIsAdmin?: boolean;
};

/**
 * Links to `/u/:handle` (or uid fallback) for non-anonymous authors.
 */
export function UserProfileLink({
  profileKey,
  label,
  className,
  anonymous,
  viewerIsAdmin,
}: Readonly<Props>) {
  const hidden = anonymous === true && viewerIsAdmin !== true;
  const text = `@${label}`;
  if (hidden || !profileKey?.trim()) {
    return <span className={className}>{text}</span>;
  }
  return (
    <Link to={`/u/${encodeURIComponent(profileKey.trim())}`} className={className}>
      {text}
    </Link>
  );
}
