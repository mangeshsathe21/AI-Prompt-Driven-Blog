/**
 * GreenTalk — Application Router
 * =================================
 * Uses React Router v7 with lazy-loaded pages (code splitting per route).
 * ProtectedRoute wraps all authenticated and role-gated routes.
 * ScrollRestoration ensures the page scrolls to top on navigation.
 *
 * Route structure:
 *   /                      → HomePage
 *   /blog                  → BlogListPage
 *   /blog/:slug            → BlogDetailPage
 *   /plants                → PlantCatalogPage
 *   /exchange              → ExchangeListingsPage
 *   /marketplace           → MarketplacePage
 *   /about                 → AboutPage
 *   /login                 → LoginPage
 *   /register              → RegisterPage
 *   /forgot-password       → ForgotPasswordPage
 *   /reset-password        → ResetPasswordPage
 *   /verify-email          → VerifyEmailPage
 *   -- Authenticated --
 *   /profile               → ProfilePage
 *   /posts/create          → CreatePostPage
 *   /posts/edit/:slug      → EditPostPage
 *   /my-posts              → MyPostsPage
 *   /listings              → MyListingsPage
 *   /listings/exchange/create  → CreateExchangeListingPage
 *   /listings/purchase/create  → CreatePurchaseListingPage
 *   /orders                → MyOrdersPage
 *   /notifications         → NotificationsPage
 *   -- Blog Admin --
 *   /admin/moderation      → ModerationDashboardPage
 *   /admin/categories      → ManageCategoriesPage
 *   -- Super Admin --
 *   /admin/users           → UserManagementPage
 *   /admin/audit-logs      → AuditLogsPage
 *   -- Errors --
 *   /403                   → ForbiddenPage
 *   *                      → NotFoundPage
 */

import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import ProtectedRoute from './ProtectedRoute'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ---- Lazy-loaded pages ----
// Public
const HomePage                  = lazy(() => import('@/pages/public/HomePage'))
const BlogListPage               = lazy(() => import('@/pages/public/BlogListPage'))
const BlogDetailPage             = lazy(() => import('@/pages/public/BlogDetailPage'))
const PlantCatalogPage           = lazy(() => import('@/pages/public/PlantCatalogPage'))
const ExchangeListingsPage       = lazy(() => import('@/pages/public/ExchangeListingsPage'))
const MarketplacePage            = lazy(() => import('@/pages/public/MarketplacePage'))
const AboutPage                  = lazy(() => import('@/pages/public/AboutPage'))
const LoginPage                  = lazy(() => import('@/pages/public/LoginPage'))
const RegisterPage               = lazy(() => import('@/pages/public/RegisterPage'))
const ForgotPasswordPage         = lazy(() => import('@/pages/public/ForgotPasswordPage'))
const ResetPasswordPage          = lazy(() => import('@/pages/public/ResetPasswordPage'))
const VerifyEmailPage            = lazy(() => import('@/pages/public/VerifyEmailPage'))
// User
const ProfilePage                = lazy(() => import('@/pages/user/ProfilePage'))
const CreatePostPage             = lazy(() => import('@/pages/user/CreatePostPage'))
const EditPostPage               = lazy(() => import('@/pages/user/EditPostPage'))
const MyPostsPage                = lazy(() => import('@/pages/user/MyPostsPage'))
const MyListingsPage             = lazy(() => import('@/pages/user/MyListingsPage'))
const CreateExchangeListingPage  = lazy(() => import('@/pages/user/CreateExchangeListingPage'))
const CreatePurchaseListingPage  = lazy(() => import('@/pages/user/CreatePurchaseListingPage'))
const MyOrdersPage               = lazy(() => import('@/pages/user/MyOrdersPage'))
const NotificationsPage          = lazy(() => import('@/pages/user/NotificationsPage'))
// Admin
const ModerationDashboardPage    = lazy(() => import('@/pages/admin/ModerationDashboardPage'))
const ManageCategoriesPage       = lazy(() => import('@/pages/admin/ManageCategoriesPage'))
const UserManagementPage         = lazy(() => import('@/pages/admin/UserManagementPage'))
const AuditLogsPage              = lazy(() => import('@/pages/admin/AuditLogsPage'))
// Errors
const NotFoundPage               = lazy(() => import('@/pages/errors/NotFoundPage'))
const ForbiddenPage              = lazy(() => import('@/pages/errors/ForbiddenPage'))

// Loading fallback while lazy chunks load
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <PageLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ---- Public ---- */}
            <Route path="/"                 element={<HomePage />} />
            <Route path="/blog"             element={<BlogListPage />} />
            <Route path="/blog/:slug"       element={<BlogDetailPage />} />
            <Route path="/plants"           element={<PlantCatalogPage />} />
            <Route path="/exchange"         element={<ExchangeListingsPage />} />
            <Route path="/marketplace"      element={<MarketplacePage />} />
            <Route path="/about"            element={<AboutPage />} />
            <Route path="/login"            element={<LoginPage />} />
            <Route path="/register"         element={<RegisterPage />} />
            <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
            <Route path="/reset-password"   element={<ResetPasswordPage />} />
            <Route path="/verify-email"     element={<VerifyEmailPage />} />

            {/* ---- Authenticated (any logged-in user) ---- */}
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/posts/create" element={
              <ProtectedRoute><CreatePostPage /></ProtectedRoute>
            } />
            <Route path="/posts/edit/:slug" element={
              <ProtectedRoute><EditPostPage /></ProtectedRoute>
            } />
            <Route path="/my-posts" element={
              <ProtectedRoute><MyPostsPage /></ProtectedRoute>
            } />
            <Route path="/listings" element={
              <ProtectedRoute><MyListingsPage /></ProtectedRoute>
            } />
            <Route path="/listings/exchange/create" element={
              <ProtectedRoute><CreateExchangeListingPage /></ProtectedRoute>
            } />
            <Route path="/listings/purchase/create" element={
              <ProtectedRoute><CreatePurchaseListingPage /></ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute><MyOrdersPage /></ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute><NotificationsPage /></ProtectedRoute>
            } />

            {/* ---- Blog Admin ---- */}
            <Route path="/admin/moderation" element={
              <ProtectedRoute role="blog_admin"><ModerationDashboardPage /></ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute role="blog_admin"><ManageCategoriesPage /></ProtectedRoute>
            } />

            {/* ---- Super Admin ---- */}
            <Route path="/admin/users" element={
              <ProtectedRoute role="super_admin"><UserManagementPage /></ProtectedRoute>
            } />
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute role="super_admin"><AuditLogsPage /></ProtectedRoute>
            } />

            {/* ---- Errors ---- */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*"    element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </PageLayout>
    </BrowserRouter>
  )
}
