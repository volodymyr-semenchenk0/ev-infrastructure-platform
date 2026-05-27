import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom polyfills for Radix UI primitives.
if (typeof window !== 'undefined') {
  Element.prototype.hasPointerCapture = vi.fn(() => false) as unknown as Element['hasPointerCapture']
  Element.prototype.setPointerCapture = vi.fn() as unknown as Element['setPointerCapture']
  Element.prototype.releasePointerCapture = vi.fn() as unknown as Element['releasePointerCapture']
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView']

  // Radix Slider (and a few other primitives) call ResizeObserver in a layout
  // effect. jsdom does not implement it, so we provide a no-op shim that is
  // enough for tests that mount the slider without measuring its geometry.
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class NoopResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver =
      NoopResizeObserver as unknown as typeof globalThis.ResizeObserver
  }
}
