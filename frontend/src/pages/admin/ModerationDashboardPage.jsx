/**
 * ModerationDashboard — blog_admin view for approving/rejecting pending posts and flagged comments
 *
 * SECURITY NOTE: This page is behind ProtectedRoute role="blog_admin".
 * The backend also enforces role checks on every API call.
 * The frontend hiding is UX convenience only, not a security boundary.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { postsApi } from '@/api/posts'
import { commentsApi } from '@/api/blog'
import { timeAgo } from '@/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ModerationDashboardPage() {
  const [tab, setTab] = useState('posts')

  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useApi(
    () => postsApi.list({ status: 'pending', page_size: 20 }), [],
  )
  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments } = useApi(
    () => commentsApi.list(null, { page_size: 20 }), [],
  )

  const pendingPosts    = postsData?.results ?? []
  const flaggedComments = (commentsData?.results ?? []).filter((c) => c.status === 'flagged')

  async function approve(slug) {
    await postsApi.approve(slug); toast.success('Post approved!'); refetchPosts()
  }
  async function reject(slug) {
    const reason = window.prompt('Rejection reason (optional):')
    await postsApi.reject(slug, reason); toast.success('Post rejected.'); refetchPosts()
  }
  async function moderateComment(id, status) {
    await commentsApi.moderate(id, status); toast.success(`Comment set to ${status}.`); refetchComments()
  }

  return (
    <>
      <Helmet><title>Moderation — GreenTalk</title></Helmet>
      <div className="container py-8">
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] mb-6">Moderation Dashboard</h1>

        <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
          {[
            ['posts', `Pending Posts (${pendingPosts.length})`],
            ['comments', `Flagged Comments (${flaggedComments.length})`],
          ].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab === t ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-[var(--color-muted)]'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          postsLoading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> :
          pendingPosts.length === 0 ? <p className="text-[var(--color-muted)] text-center py-12">✅ No pending posts!</p> :
          <div className="flex flex-col gap-4">
            {pendingPosts.map((post) => (
              <div key={post.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link to={`/blog/${post.slug}`} className="font-bold hover:text-[var(--color-brand)] line-clamp-1">
                    {post.title}
                  </Link>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    By {post.author?.username} · {timeAgo(post.created_at)}
                    {post.category && ` · ${post.category.name}`}
                  </p>
                  {post.excerpt && <p className="text-sm text-[var(--color-muted)] line-clamp-2 mt-1">{post.excerpt}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(post.slug)} className="btn btn-primary btn-sm">✅ Approve</button>
                  <button onClick={() => reject(post.slug)}  className="btn btn-danger btn-sm">❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'comments' && (
          commentsLoading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> :
          flaggedComments.length === 0 ? <p className="text-[var(--color-muted)] text-center py-12">✅ No flagged comments!</p> :
          <div className="flex flex-col gap-4">
            {flaggedComments.map((comment) => (
              <div key={comment.id} className="card p-4 border-l-4 border-[var(--color-warning)]">
                <p className="text-sm font-semibold mb-1">
                  By {comment.author?.username} · {timeAgo(comment.created_at)}
                </p>
                <p className="text-sm text-[var(--color-text)] mb-3">{comment.content}</p>
                <div className="flex gap-2">
                  <button onClick={() => moderateComment(comment.id, 'visible')} className="btn btn-ghost btn-sm">Restore</button>
                  <button onClick={() => moderateComment(comment.id, 'hidden')}  className="btn btn-danger btn-sm">Hide</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
