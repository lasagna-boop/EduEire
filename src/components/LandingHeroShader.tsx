import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { LANDING_SHADER_GRADIENT_PROPS } from "../lib/landingShaderPreset";

export default function LandingHeroShader() {
  return (
    <ShaderGradientCanvas
      className="landing__hero-canvas-root"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
      pixelDensity={1.1}
      fov={45}
      pointerEvents="none"
      lazyLoad={false}
    >
      <ShaderGradient {...LANDING_SHADER_GRADIENT_PROPS} />
    </ShaderGradientCanvas>
  );
}
