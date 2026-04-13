import { presets } from "@shadergradient/react";

/**
 * Shared hero + university badge shader.
 * Irish flag colours in brand form: deep green, #2d6a4f, #ff9f1c — no grey neutrals.
 * Lower uFrequency + moderate uStrength = broader pools of each hue (less muddy blend).
 */
export const LANDING_SHADER_GRADIENT_PROPS = {
  ...presets.halo.props,
  color1: "#1b4332",
  color2: "#2d6a4f",
  color3: "#ff9f1c",
  envPreset: "dawn" as const,
  brightness: 1.36,
  uSpeed: 0.2,
  uStrength: 3,
  uDensity: 1.06,
  uFrequency: 3.4,
  reflection: 0.05,
  grain: "off" as const,
};
