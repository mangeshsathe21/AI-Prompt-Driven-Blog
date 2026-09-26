/**
 * HomePage — public landing page
 * SEO: react-helmet-async injects <title> and meta description
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { postsApi } from '@/api/posts'
import { categoriesApi } from '@/api/blog'
import PostCard from '@/components/blog/PostCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import SearchBar from '@/components/ui/SearchBar'

const APP_NAME = import.meta.env.VITE_APP_NAME || 'GreenTalk'
const APP_DESC = import.meta.env.VITE_APP_DESCRIPTION || 'Community blog and plant exchange platform'

export default function HomePage() {
  const [searchQ, setSearchQ] = useState('')
  const navigate = useNavigate()

  const { data: postsData, isLoading: postsLoading } = useApi(
    () => postsApi.list({ page_size: 6, ordering: '-published_at' }),
    [],
  )
  const { data: categoriesData } = useApi(() => categoriesApi.list(), [])

  const posts = postsData?.results ?? []
  const categories = categoriesData?.results ?? categoriesData ?? []

  function handleSearch(q) {
    if (q.trim()) navigate(`/blog?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <>
      <Helmet>
        <title>{APP_NAME} — Grow Together</title>
        <meta name="description" content={APP_DESC} />
      </Helmet>

      {/* Hero */}
      <section className="bg-[var(--color-brand-dark)] text-white py-20 px-4">
        <div className="container text-center flex flex-col items-center gap-6">
          <div className="text-6xl">🌱</div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Grow Together with GreenTalk
          </h1>
          <p className="text-lg text-[var(--color-green-200)] max-w-xl">
            A community for home gardeners, open-land planters, and ecological
            restoration enthusiasts across India.
          </p>
          <div className="w-full max-w-lg">
            <SearchBar
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={handleSearch}
              placeholder="Search plants, posts, guides…"
            />
          </div>
          <div className="flex gap-4 flex-wrap justify-center mt-2">
            <Link to="/register" className="btn btn-primary btn-lg">Join the community</Link>
            <Link to="/blog" className="btn btn-ghost btn-lg border-white text-white hover:bg-white/10">
              Browse posts
            </Link>
          </div>
        </div>
      </section>

      {/* Categories quick links */}
      {categories.length > 0 && (
        <section className="container py-10">
          <h2 className="text-xl font-bold mb-4 text-[var(--color-brand-dark)]">Browse by Category</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/blog?category=${cat.slug}`}
                className="badge badge-green px-4 py-2 text-sm hover:opacity-80 transition-opacity"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest posts */}
      <section className="container pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-brand-dark)]">Latest Posts</h2>
          <Link to="/blog" className="btn btn-ghost btn-sm">View all →</Link>
        </div>

        {postsLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : posts.length === 0 ? (
          <p className="text-[var(--color-muted)] py-8 text-center">No posts yet. Be the first to share!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </section>

      {/* CTA strips */}
      <section className="bg-[var(--color-green-50)] py-12">
        <div className="container grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: '🔄', title: 'Plant Exchange', desc: 'Give away or swap plants with nearby community members.', to: '/exchange' },
            { icon: '🛒', title: 'Marketplace', desc: 'Buy and sell plants, seeds, and gardening supplies.', to: '/marketplace' },
            { icon: '📖', title: 'Plant Catalog', desc: 'Explore our reference catalog of native and common plants.', to: '/plants' },
          ].map(({ icon, title, desc, to }) => (
            <Link key={to} to={to} className="card p-6 flex flex-col items-center gap-3 hover:shadow-lg transition-shadow group">
              <div className="text-4xl">{icon}</div>
              <h3 className="font-bold text-lg text-[var(--color-brand-dark)] group-hover:text-[var(--color-brand)]">{title}</h3>
              <p className="text-sm text-[var(--color-muted)]">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
