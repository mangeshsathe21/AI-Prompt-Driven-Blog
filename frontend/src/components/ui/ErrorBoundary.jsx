/**
 * ErrorBoundary — catches rendering errors and shows a fallback UI
 * Class component required — React does not yet support error boundaries as function components.
 */
import { Component } from 'react'
import PropTypes from 'prop-types'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to console in dev; wire to Sentry/error tracker in prod
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center p-8">
            <div className="text-5xl">🌿</div>
            <h2 className="text-xl font-bold text-[var(--color-brand-dark)]">
              Something went wrong
            </h2>
            <p className="text-[var(--color-muted)] max-w-sm">
              An unexpected error occurred. Please refresh the page or go back.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn btn-primary"
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
}
