/**
 * GreenTalk — Client-side HTML Sanitizer
 * =========================================
 * Uses DOMPurify to sanitize HTML before rendering via dangerouslySetInnerHTML.
 *
 * SECURITY NOTE:
 * The backend ALSO sanitizes content via nh3 before storage.
 * This is a defence-in-depth second layer on the client.
 * Never render user-generated HTML without calling sanitize() first.
 *
 * Usage:
 *   <div dangerouslySetInnerHTML={{ __html: sanitize(post.content) }} />
 */

import DOMPurify from 'dompurify'

const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code',
    'col', 'colgroup', 'dd', 'del', 'details', 'div', 'dl', 'dt',
    'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre',
    'q', 's', 'small', 'span', 'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'th', 'thead', 'tfoot', 'tr', 'u', 'ul',
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'colspan', 'rowspan', 'scope', 'span',
    'cite', 'datetime',
  ],
  // Force all links to be safe
  FORCE_BODY: true,
}

/**
 * Sanitize HTML string for safe rendering.
 * @param {string} dirty - raw HTML
 * @returns {string} sanitized HTML
 */
export function sanitize(dirty) {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, DEFAULT_CONFIG)
}

/**
 * Strip ALL HTML — returns plain text.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}
