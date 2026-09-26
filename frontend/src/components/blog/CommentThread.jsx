/**
 * CommentThread — renders threaded comments with reply support
 */
import { useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '@/context/AuthContext'
import { commentsApi } from '@/api/blog'
import { timeAgo } from '@/utils/formatters'
import { sanitize } from '@/utils/sanitize'
import toast from 'react-hot-toast'

export default function CommentThread({ postId, comments, onRefresh }) {
  const topLevel = comments.filter((c) => !c.parent)
  return (
    <section aria-label="Comments">
      <h3 className="text-lg font-bold mb-4 text-[var(--color-brand-dark)]">
        Comments ({comments.length})
      </h3>
      <CommentForm postId={postId} parentId={null} onSuccess={onRefresh} />
      <ul className="mt-6 space-y-4" aria-label="Comment list">
        {topLevel.map((c) => (
          <CommentItem key={c.id} comment={c} postId={postId} onRefresh={onRefresh} depth={0} />
        ))}
      </ul>
    </section>
  )
}

function CommentItem({ comment, postId, onRefresh, depth }) {
  const [replying, setReplying] = useState(false)
  const { isAuthenticated, user, isBlogAdmin } = useAuth()
  const canModerate = isBlogAdmin
  const isOwner = user?.id === comment.author?.id

  async function handleDelete() {
    if (!window.confirm('Delete this comment?')) return
    try {
      await commentsApi.delete(comment.id)
      toast.success('Comment deleted.')
      onRefresh()
    } catch { /* error toast handled by client */ }
  }

  return (
    <li>
      <div className="flex gap-3">
        {/* Avatar placeholder */}
        <div className="w-8 h-8 rounded-full bg-[var(--color-green-200)] flex items-center justify-center text-xs font-bold text-[var(--color-brand-dark)] shrink-0">
          {comment.author?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-sm">{comment.author?.full_name || comment.author?.username}</span>
            <span className="text-xs text-[var(--color-muted)]">{timeAgo(comment.created_at)}</span>
            {comment.status !== 'visible' && (
              <span className="badge badge-yellow text-xs">{comment.status}</span>
            )}
          </div>
          {/* Sanitized HTML comment content */}
          <div
            className="text-sm mt-1 text-[var(--color-text)] prose prose-sm"
            dangerouslySetInnerHTML={{ __html: sanitize(comment.content) }}
          />
          <div className="flex gap-3 mt-1">
            {isAuthenticated && depth < 2 && (
              <button
                onClick={() => setReplying((r) => !r)}
                className="text-xs text-[var(--color-brand)] hover:underline"
              >
                {replying ? 'Cancel' : 'Reply'}
              </button>
            )}
            {(isOwner || canModerate) && (
              <button onClick={handleDelete} className="text-xs text-[var(--color-danger)] hover:underline">
                Delete
              </button>
            )}
          </div>
          {replying && (
            <div className="mt-2">
              <CommentForm postId={postId} parentId={comment.id} onSuccess={() => { setReplying(false); onRefresh() }} />
            </div>
          )}
          {/* Nested replies */}
          {comment.replies?.length > 0 && (
            <ul className="mt-3 pl-4 border-l-2 border-[var(--color-green-100)] space-y-3">
              {comment.replies.map((r) => (
                <CommentItem key={r.id} comment={r} postId={postId} onRefresh={onRefresh} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

function CommentForm({ postId, parentId, onSuccess }) {
  const { isAuthenticated } = useAuth()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isAuthenticated) return (
    <p className="text-sm text-[var(--color-muted)]">
      <a href="/login" className="text-[var(--color-brand)] underline">Log in</a> to leave a comment.
    </p>
  )

  async function submit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await commentsApi.create({ post: postId, parent: parentId, content })
      setContent('')
      onSuccess?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={`comment-input-${parentId ?? 'root'}`} className="sr-only">
        {parentId ? 'Write a reply' : 'Write a comment'}
      </label>
      <textarea
        id={`comment-input-${parentId ?? 'root'}`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Write a reply…' : 'Share your thoughts…'}
        rows={3}
        className="form-input resize-none"
        required
      />
      <button type="submit" disabled={submitting || !content.trim()} className="btn btn-primary btn-sm self-end">
        {submitting ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
      </button>
    </form>
  )
}

const commentShape = PropTypes.shape({
  id:      PropTypes.number,
  author:  PropTypes.object,
  content: PropTypes.string,
  status:  PropTypes.string,
  parent:  PropTypes.number,
  replies: PropTypes.array,
  created_at: PropTypes.string,
})

CommentThread.propTypes = {
  postId:    PropTypes.number.isRequired,
  comments:  PropTypes.arrayOf(commentShape).isRequired,
  onRefresh: PropTypes.func.isRequired,
}
CommentItem.propTypes = { comment: commentShape, postId: PropTypes.number, onRefresh: PropTypes.func, depth: PropTypes.number }
CommentForm.propTypes = { postId: PropTypes.number, parentId: PropTypes.number, onSuccess: PropTypes.func }
