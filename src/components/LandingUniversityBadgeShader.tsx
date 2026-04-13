import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { LANDING_SHADER_GRADIENT_PROPS } from "../lib/landingShaderPreset";

/** Small WebGL tile — same motion as the landing hero. */
export default function LandingUniversityBadgeShader() {
  return (
    <ShaderGradientCanvas
      className="landing__community-badge-canvas"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
      pixelDensity={1}
      fov={48}
      pointerEvents="none"
      lazyLoad
    >
      <ShaderGradient {...LANDING_SHADER_GRADIENT_PROPS} />
    </ShaderGradientCanvas>
  );
}
