import { lazy, Suspense } from "react";

const BadgeShader = lazy(() => import("./LandingUniversityBadgeShader"));

type Props = {
  prefersReducedMotion: boolean;
  /** e.g. `landing__community-badge--blue` */
  variantClass?: string;
};

export function LandingUniversityBadge({ prefersReducedMotion, variantClass = "" }: Readonly<Props>) {
  return (
    <div
      className={["landing__community-badge", variantClass].filter(Boolean).join(" ")}
      aria-hidden
    >
      {!prefersReducedMotion ? (
        <Suspense fallback={<div className="landing__community-badge__shader-fallback" />}>
          <BadgeShader />
        </Suspense>
      ) : (
        <div className="landing__community-badge__shader-fallback" />
      )}
      <span className="landing__community-badge__emoji">🎓</span>
    </div>
  );
}
