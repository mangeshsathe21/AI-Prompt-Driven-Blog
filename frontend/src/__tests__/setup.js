/**
 * Vitest global test setup
 * Runs before every test file.
 */
import '@testing-library/jest-dom'

// Mock IntersectionObserver (not available in jsdom)
global.IntersectionObserver = class {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

// Mock ResizeObserver
global.ResizeObserver = class {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

// Suppress console.error noise from intentional error tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
    ) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })
