/**
 * BlogListPage — paginated, filterable, searchable list of posts
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { postsApi } from '@/api/posts'
import { categoriesApi, tagsApi } from '@/api/blog'
import PostCard from '@/components/blog/PostCard'
import Pagination from '@/components/ui/Pagination'
import SearchBar from '@/components/ui/SearchBar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useApi } from '@/hooks/useApi'

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts]         = useState([])
  const [totalPages, setTotal]    = useState(1)
  const [isLoading, setLoading]   = useState(true)

  const page     = Number(searchParams.get('page') || 1)
  const category = searchParams.get('category') || ''
  const tag      = searchParams.get('tag') || ''
  const q        = searchParams.get('q') || ''
  const ordering = searchParams.get('ordering') || '-published_at'

  const { data: catData }  = useApi(() => categoriesApi.list(), [])
  const { data: tagData }  = useApi(() => tagsApi.list({ page_size: 50 }), [])
  const categories = catData?.results ?? catData ?? []
  const tags       = tagData?.results ?? []

  useEffect(() => {
    setLoading(true)
    const params = { page, page_size: 12, ordering }
    if (category) params.category = category
    if (tag)      params.tag = tag

    const apiFn = q
      ? postsApi.search(q, params)
      : postsApi.list(params)

    Promise.resolve(apiFn)
      .then(({ data }) => {
        setPosts(data.results ?? [])
        setTotal(data.total_pages ?? 1)
      })
      .finally(() => setLoading(false))
  }, [page, category, tag, q, ordering])

  function setParam(key, val) {
    const next = new URLSearchParams(searchParams)
    if (val) next.set(key, val); else next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <>
      <Helmet>
        <title>Blog — GreenTalk</title>
        <meta name="description" content="Browse gardening and plant care articles from the GreenTalk community." />
      </Helmet>

      <div className="container py-8">
        <h1 className="text-3xl font-bold text-[var(--color-brand-dark)] mb-6">Blog</h1>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchBar
              value={q}
              onChange={(v) => setParam('q', v)}
              onSubmit={(v) => setParam('q', v)}
            />
          </div>
          <select
            value={ordering}
            onChange={(e) => setParam('ordering', e.target.value)}
            className="form-input w-auto"
            aria-label="Sort posts"
          >
            <option value="-published_at">Newest</option>
            <option value="published_at">Oldest</option>
            <option value="-views_count">Most viewed</option>
          </select>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="lg:w-56 shrink-0" aria-label="Filters">
            <div className="card p-4 mb-4">
              <h2 className="font-bold mb-3 text-[var(--color-brand-dark)]">Categories</h2>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setParam('category', '')}
                    className={`w-full text-left text-sm px-2 py-1 rounded-md ${!category ? 'font-bold text-[var(--color-brand)]' : 'hover:bg-[var(--color-green-50)]'}`}
                  >
                    All
                  </button>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setParam('category', c.slug)}
                      className={`w-full text-left text-sm px-2 py-1 rounded-md ${category === c.slug ? 'font-bold text-[var(--color-brand)]' : 'hover:bg-[var(--color-green-50)]'}`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {tags.length > 0 && (
              <div className="card p-4">
                <h2 className="font-bold mb-3 text-[var(--color-brand-dark)]">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setParam('tag', t.slug === tag ? '' : t.slug)}
                      className={`badge text-xs cursor-pointer ${t.slug === tag ? 'badge-green font-bold' : 'badge-gray hover:badge-green'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Post grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-[var(--color-muted)]">
                <p className="text-5xl mb-4">🌿</p>
                <p className="text-lg">No posts found. Try a different search or filter.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {posts.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => setParam('page', p)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
