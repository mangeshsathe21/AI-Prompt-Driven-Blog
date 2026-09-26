/**
 * PageLayout — wraps pages with Navbar + Footer + main landmark
 */
import PropTypes from 'prop-types'
import Navbar from './Navbar'
import Footer from './Footer'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export default function PageLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

PageLayout.propTypes = { children: PropTypes.node.isRequired }
