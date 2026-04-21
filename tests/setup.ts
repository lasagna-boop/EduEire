import "@testing-library/jest-dom/vitest";

// Landing hero uses @react-three/fiber Canvas; jsdom has no ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
