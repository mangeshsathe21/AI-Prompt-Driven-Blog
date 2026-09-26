/**
 * Navbar — role-aware top navigation bar
 * Shows different links based on auth state and user role.
 *
 * SECURITY NOTE: hiding admin links is UX only.
 * Backend permission checks are the real security boundary.
 */
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'

export default function Navbar() {
  const { isAuthenticated, user, logout, isBlogAdmin, isSuperAdmin } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors px-2 py-1 rounded-md
     ${isActive
       ? 'text-[var(--color-brand)] bg-[var(--color-green-50)]'
       : 'text-[var(--color-text)] hover:text-[var(--color-brand)] hover:bg-[var(--color-green-50)]'}`

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-border)] shadow-sm">
      <nav className="container flex items-center justify-between h-16" aria-label="Main navigation">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-[var(--color-brand)]">
          🌱 GreenTalk
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/blog" className={linkCls}>Blog</NavLink>
          <NavLink to="/plants" className={linkCls}>Plants</NavLink>
          <NavLink to="/exchange" className={linkCls}>Exchange</NavLink>
          <NavLink to="/marketplace" className={linkCls}>Marketplace</NavLink>
          <NavLink to="/about" className={linkCls}>About</NavLink>

          {/* Blog Admin links */}
          {isBlogAdmin && (
            <NavLink to="/admin/moderation" className={linkCls}>Moderation</NavLink>
          )}
          {/* Super Admin links */}
          {isSuperAdmin && (
            <NavLink to="/admin/users" className={linkCls}>Users</NavLink>
          )}
        </div>

        {/* Auth actions */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Notifications bell */}
              <NavLink to="/notifications" className="relative p-2 rounded-md hover:bg-[var(--color-green-50)]" aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}>
                <svg className="w-5 h-5 text-[var(--color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[var(--color-danger)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
              <NavLink to="/profile" className={linkCls} aria-label="My profile">
                {user?.full_name?.split(' ')[0] || user?.username}
              </NavLink>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-white px-4 pb-4 flex flex-col gap-1">
          {[
            { to: '/blog', label: 'Blog' },
            { to: '/plants', label: 'Plants' },
            { to: '/exchange', label: 'Exchange' },
            { to: '/marketplace', label: 'Marketplace' },
            { to: '/about', label: 'About' },
            ...(isBlogAdmin ? [{ to: '/admin/moderation', label: 'Moderation' }] : []),
            ...(isSuperAdmin ? [{ to: '/admin/users', label: 'Users' }] : []),
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkCls} onClick={() => setMenuOpen(false)}>
              {label}
            </NavLink>
          ))}
          <hr className="border-[var(--color-border)] my-2" />
          {isAuthenticated ? (
            <>
              <NavLink to="/notifications" className={linkCls} onClick={() => setMenuOpen(false)}>
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </NavLink>
              <NavLink to="/profile" className={linkCls} onClick={() => setMenuOpen(false)}>Profile</NavLink>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="btn btn-ghost btn-sm w-full mt-1">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
