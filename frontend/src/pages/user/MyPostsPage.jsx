import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { postsApi } from '@/api/posts'
import { useApi } from '@/hooks/useApi'
import PostCard from '@/components/blog/PostCard'
import Pagination from '@/components/ui/Pagination'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function MyPostsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useApi(
    () => postsApi.list({ page, page_size: 9, ordering: '-created_at' }),
    [page],
  )
  const posts = data?.results ?? []

  async function handleDelete(slug) {
    if (!window.confirm('Delete this post?')) return
    try {
      await postsApi.delete(slug)
      toast.success('Post deleted.')
      refetch()
    } catch { /* handled by client */ }
  }

  return (
    <>
      <Helmet><title>My Posts — GreenTalk</title></Helmet>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">My Posts</h1>
          <Link to="/posts/create" className="btn btn-primary btn-sm">+ New post</Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-muted)]">
            <p className="text-5xl mb-4">✍️</p>
            <p className="mb-4">You haven't written any posts yet.</p>
            <Link to="/posts/create" className="btn btn-primary">Write your first post</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div key={post.id} className="relative group">
                  <PostCard post={post} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/posts/edit/${post.slug}`} className="btn btn-sm bg-white border border-[var(--color-border)] shadow-sm" aria-label="Edit post">✏️</Link>
                    <button onClick={() => handleDelete(post.slug)} className="btn btn-sm bg-white border border-[var(--color-border)] shadow-sm text-[var(--color-danger)]" aria-label="Delete post">🗑</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={data?.total_pages ?? 1} onPageChange={setPage} />
          </>
        )}
      </div>
    </>
  )
}
