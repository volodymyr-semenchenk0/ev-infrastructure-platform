import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom polyfills for Radix UI primitives.
if (typeof window !== 'undefined') {
  Element.prototype.hasPointerCapture = vi.fn(() => false) as unknown as Element['hasPointerCapture']
  Element.prototype.setPointerCapture = vi.fn() as unknown as Element['setPointerCapture']
  Element.prototype.releasePointerCapture = vi.fn() as unknown as Element['releasePointerCapture']
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView']
}
