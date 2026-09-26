/**
 * PostCard — displays a blog post summary in a card
 * Props: post object from the API
 */
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { timeAgo, truncate, statusVariant } from '@/utils/formatters'
import clsx from 'clsx'

export default function PostCard({ post }) {
  const {
    slug, title, excerpt, author, category,
    featured_image_url, views_count, like_count,
    comment_count, published_at, status,
  } = post

  return (
    <article className="card flex flex-col h-full group" aria-label={title}>
      {/* Featured image */}
      {featured_image_url && (
        <Link to={`/blog/${slug}`} tabIndex={-1} aria-hidden="true">
          <img
            src={featured_image_url}
            alt={`Cover image for ${title}`}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </Link>
      )}

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Category + status */}
        <div className="flex items-center gap-2 flex-wrap">
          {category && (
            <Link
              to={`/blog?category=${category.slug}`}
              className="badge badge-green text-xs hover:opacity-80"
              aria-label={`Category: ${category.name}`}
            >
              {category.name}
            </Link>
          )}
          {status && status !== 'published' && (
            <span className={clsx('badge text-xs', statusVariant(status))}>{status}</span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold leading-snug group-hover:text-[var(--color-brand)] transition-colors">
          <Link to={`/blog/${slug}`} className="focus:outline-none focus-visible:underline">
            {title}
          </Link>
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-sm text-[var(--color-muted)] line-clamp-3">
            {truncate(excerpt, 180)}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
          {/* Author + date */}
          <div className="text-xs text-[var(--color-muted)]">
            {author && <span>{author.full_name || author.username}</span>}
            {published_at && <span className="ml-1">· {timeAgo(published_at)}</span>}
          </div>
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span aria-label={`${views_count} views`}>👁 {views_count}</span>
            <span aria-label={`${like_count} likes`}>❤️ {like_count}</span>
            <span aria-label={`${comment_count} comments`}>💬 {comment_count}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

PostCard.propTypes = {
  post: PropTypes.shape({
    slug:               PropTypes.string.isRequired,
    title:              PropTypes.string.isRequired,
    excerpt:            PropTypes.string,
    author:             PropTypes.object,
    category:           PropTypes.object,
    featured_image_url: PropTypes.string,
    views_count:        PropTypes.number,
    like_count:         PropTypes.number,
    comment_count:      PropTypes.number,
    published_at:       PropTypes.string,
    status:             PropTypes.string,
  }).isRequired,
}
