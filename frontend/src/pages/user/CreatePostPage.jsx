/**
 * CreatePostPage — rich text post editor with image upload
 * Status workflow note:
 *   Regular users → post saved as "pending" (backend enforced)
 *   Blog admin+ → post auto-publishes (backend enforced)
 *   UI shows a note explaining this — backend is the authority.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { postsApi } from '@/api/posts'
import { useApi } from '@/hooks/useApi'
import { categoriesApi, tagsApi } from '@/api/blog'
import { useAuth } from '@/context/AuthContext'
import RichTextEditor from '@/components/editor/RichTextEditor'
import ImageUploader from '@/components/ui/ImageUploader'
import { validators } from '@/utils/validators'
import toast from 'react-hot-toast'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { isBlogAdmin } = useAuth()
  const [title, setTitle]       = useState('')
  const [content, setContent]   = useState('')
  const [excerpt, setExcerpt]   = useState('')
  const [categoryId, setCategory] = useState('')
  const [tagIds, setTagIds]     = useState([])
  const [image, setImage]       = useState(null)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDesc, setSeoDesc]   = useState('')
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)

  const { data: catData } = useApi(() => categoriesApi.list(), [])
  const { data: tagData } = useApi(() => tagsApi.list({ page_size: 50 }), [])
  const categories = catData?.results ?? catData ?? []
  const tags       = tagData?.results ?? []

  function validate() {
    const errs = {}
    if (!title.trim()) errs.title = 'Title is required.'
    if (!content || content === '<p></p>') errs.content = 'Content is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      if (excerpt) formData.append('excerpt', excerpt)
      if (categoryId) formData.append('category', categoryId)
      tagIds.forEach((id) => formData.append('tag_ids', id))
      if (image) formData.append('featured_image', image)
      if (seoTitle) formData.append('seo_meta_title', seoTitle)
      if (seoDesc)  formData.append('seo_meta_description', seoDesc)

      const { data } = await postsApi.create(formData)
      toast.success(
        isBlogAdmin
          ? 'Post published!'
          : 'Post submitted for review. You\'ll be notified when it\'s approved.',
      )
      navigate(`/blog/${data.slug}`)
    } finally {
      setSaving(false)
    }
  }

  function toggleTag(id) {
    setTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  return (
    <>
      <Helmet><title>Create Post — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-[var(--color-brand-dark)] mb-2">Create post</h1>
        {!isBlogAdmin && (
          <div className="bg-[var(--color-green-50)] border border-[var(--color-green-200)] rounded-xl p-3 mb-6 text-sm text-[var(--color-brand-dark)]">
            ℹ️ Your post will be submitted for review. A blog admin will approve it before it appears publicly.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="form-group mb-0">
            <label htmlFor="title" className="form-label">Title <span className="required">*</span></label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className={`form-input text-xl font-bold ${errors.title ? 'error' : ''}`}
              placeholder="Your post title…" aria-invalid={!!errors.title} />
            {errors.title && <p className="form-error" role="alert">{errors.title}</p>}
          </div>

          <div className="form-group mb-0">
            <label htmlFor="excerpt" className="form-label">Excerpt <span className="form-hint">(shown in post cards)</span></label>
            <textarea id="excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
              className="form-input resize-none" placeholder="Short summary…" maxLength={500} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label htmlFor="category" className="form-label">Category</label>
              <select id="category" value={categoryId} onChange={(e) => setCategory(e.target.value)} className="form-input">
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p className="form-label mb-2">Tags</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select tags">
                {tags.map((t) => (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                    aria-pressed={tagIds.includes(t.id)}
                    className={`badge cursor-pointer ${tagIds.includes(t.id) ? 'badge-green' : 'badge-gray hover:badge-green'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured image */}
          <ImageUploader label="Featured image" onSelect={setImage} />

          {/* Content editor */}
          <div>
            <p className="form-label mb-2">Content <span className="required">*</span></p>
            <RichTextEditor value={content} onChange={setContent} placeholder="Write your post…" />
            {errors.content && <p className="form-error mt-1" role="alert">{errors.content}</p>}
          </div>

          {/* SEO */}
          <details className="card p-4">
            <summary className="cursor-pointer font-semibold text-sm text-[var(--color-brand-dark)]">SEO settings (optional)</summary>
            <div className="mt-4 flex flex-col gap-3">
              <div className="form-group mb-0">
                <label htmlFor="seo-title" className="form-label text-sm">SEO title <span className="form-hint">(max 160 chars)</span></label>
                <input id="seo-title" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
                  maxLength={160} className="form-input" />
              </div>
              <div className="form-group mb-0">
                <label htmlFor="seo-desc" className="form-label text-sm">SEO description <span className="form-hint">(max 320 chars)</span></label>
                <textarea id="seo-desc" rows={2} value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)}
                  maxLength={320} className="form-input resize-none" />
              </div>
            </div>
          </details>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Publishing…' : isBlogAdmin ? 'Publish' : 'Submit for review'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </>
  )
}
