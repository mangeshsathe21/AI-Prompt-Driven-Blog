import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[var(--color-brand-dark)] text-[var(--color-green-200)] mt-16">
      <div className="container py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <p className="text-lg font-bold text-white mb-2">🌱 GreenTalk</p>
          <p className="text-sm opacity-80">
            A community for plant lovers, gardeners, and ecological restoration
            enthusiasts across India.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <p className="font-semibold text-white mb-2">Explore</p>
          <ul className="space-y-1 text-sm">
            {[
              ['/blog', 'Blog'],
              ['/plants', 'Plant Catalog'],
              ['/exchange', 'Plant Exchange'],
              ['/marketplace', 'Marketplace'],
              ['/about', 'About'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-semibold text-white mb-2">Account</p>
          <ul className="space-y-1 text-sm">
            <li><Link to="/login" className="hover:text-white transition-colors">Log in</Link></li>
            <li><Link to="/register" className="hover:text-white transition-colors">Sign up</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <p className="text-center text-xs opacity-60">
          © {new Date().getFullYear()} GreenTalk — Open source, MIT license. Grow together 🌿
        </p>
      </div>
    </footer>
  )
}
