/**
 * BlogDetailPage — single post view with comments, likes, and SEO meta
 */
import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { postsApi } from '@/api/posts'
import { commentsApi, likesApi } from '@/api/blog'
import { useAuth } from '@/context/AuthContext'
import { sanitize } from '@/utils/sanitize'
import { formatDate, timeAgo } from '@/utils/formatters'
import CommentThread from '@/components/blog/CommentThread'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const APP_URL = import.meta.env.VITE_APP_URL || ''

export default function BlogDetailPage() {
  const { slug } = useParams()
  const { isAuthenticated, isBlogAdmin } = useAuth()
  const navigate = useNavigate()
  const [likeState, setLikeState] = useState(null) // { liked, count }

  const { data: post, isLoading, error, refetch } = useApi(
    () => postsApi.get(slug), [slug],
  )
  const { data: commentsData, refetch: refetchComments } = useApi(
    () => commentsApi.list(post?.id),
    [post?.id],
  )
  const comments = commentsData?.results ?? commentsData ?? []

  if (isLoading) return (
    <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
  )
  if (error || !post) return (
    <div className="container py-16 text-center">
      <p className="text-5xl mb-4">🌵</p>
      <h1 className="text-2xl font-bold mb-2">Post not found</h1>
      <Link to="/blog" className="btn btn-primary mt-4">Back to blog</Link>
    </div>
  )

  const liked      = likeState?.liked  ?? false
  const likeCount  = likeState?.count  ?? post.like_count ?? 0

  async function handleLike() {
    if (!isAuthenticated) { toast.error('Log in to like posts.'); return }
    try {
      const { data } = await likesApi.toggle({ post: post.id })
      setLikeState(data)
    } catch { /* toast handled by client */ }
  }

  async function handleApprove() {
    await postsApi.approve(slug)
    toast.success('Post approved!')
    refetch()
  }

  async function handleReject() {
    const reason = window.prompt('Rejection reason (optional):')
    await postsApi.reject(slug, reason)
    toast.success('Post rejected.')
    refetch()
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post permanently?')) return
    await postsApi.delete(slug)
    toast.success('Post deleted.')
    navigate('/blog')
  }

  return (
    <>
      <Helmet>
        <title>{post.seo_meta_title || post.title} — GreenTalk</title>
        <meta name="description" content={post.seo_meta_description || post.excerpt || ''} />
        <link rel="canonical" href={`${APP_URL}/blog/${slug}`} />
        <meta property="og:title"       content={post.seo_meta_title || post.title} />
        <meta property="og:description" content={post.seo_meta_description || post.excerpt || ''} />
        {post.featured_image_url && <meta property="og:image" content={post.featured_image_url} />}
      </Helmet>

      <article className="container py-8 max-w-3xl" aria-label={post.title}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-muted)] mb-4">
          <Link to="/" className="hover:text-[var(--color-brand)]">Home</Link>
          {' › '}
          <Link to="/blog" className="hover:text-[var(--color-brand)]">Blog</Link>
          {post.category && (
            <>
              {' › '}
              <Link to={`/blog?category=${post.category.slug}`} className="hover:text-[var(--color-brand)]">
                {post.category.name}
              </Link>
            </>
          )}
        </nav>

        {/* Featured image */}
        {post.featured_image_url && (
          <img
            src={post.featured_image_url}
            alt={`Cover image for ${post.title}`}
            className="w-full h-64 sm:h-80 object-cover rounded-xl mb-6"
          />
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-brand-dark)] leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-muted)] mb-6 pb-6 border-b border-[var(--color-border)]">
          {post.author && (
            <span>By <strong>{post.author.full_name || post.author.username}</strong></span>
          )}
          {post.published_at && (
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          )}
          <span>👁 {post.views_count} views</span>
          <span>💬 {post.comment_count} comments</span>
          {post.tags?.map((t) => (
            <Link key={t.id} to={`/blog?tag=${t.slug}`} className="badge badge-green">{t.name}</Link>
          ))}
        </div>

        {/* Content — sanitized HTML */}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitize(post.content) }}
        />

        {/* Like button */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleLike}
            aria-label={liked ? 'Unlike this post' : 'Like this post'}
            aria-pressed={liked}
            className={`btn ${liked ? 'btn-danger' : 'btn-ghost'}`}
          >
            ❤️ {liked ? 'Liked' : 'Like'} ({likeCount})
          </button>
        </div>

        {/* Admin moderation actions */}
        {isBlogAdmin && (
          <div className="mt-4 flex flex-wrap gap-2 p-4 bg-[var(--color-green-50)] rounded-xl border border-[var(--color-border)]">
            <span className="text-sm font-semibold text-[var(--color-brand-dark)] w-full">
              Moderation:
            </span>
            {post.status === 'pending' && (
              <>
                <button onClick={handleApprove} className="btn btn-primary btn-sm">✅ Approve</button>
                <button onClick={handleReject}  className="btn btn-danger btn-sm">❌ Reject</button>
              </>
            )}
            {post.status === 'published' && (
              <button onClick={() => postsApi.unpublish(slug).then(refetch)} className="btn btn-ghost btn-sm">
                Unpublish
              </button>
            )}
            <Link to={`/posts/edit/${slug}`} className="btn btn-ghost btn-sm">✏️ Edit</Link>
            <button onClick={handleDelete} className="btn btn-danger btn-sm">🗑 Delete</button>
          </div>
        )}

        {/* Comments */}
        <div className="mt-12">
          <CommentThread postId={post.id} comments={comments} onRefresh={refetchComments} />
        </div>
      </article>
    </>
  )
}
