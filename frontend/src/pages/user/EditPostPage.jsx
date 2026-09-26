import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { postsApi } from '@/api/posts'
import { useApi } from '@/hooks/useApi'
import { categoriesApi, tagsApi } from '@/api/blog'
import RichTextEditor from '@/components/editor/RichTextEditor'
import ImageUploader from '@/components/ui/ImageUploader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function EditPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const { data: post, isLoading } = useApi(() => postsApi.get(slug), [slug])
  const { data: catData } = useApi(() => categoriesApi.list(), [])
  const { data: tagData } = useApi(() => tagsApi.list({ page_size: 50 }), [])

  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [categoryId, setCategory] = useState('')
  const [tagIds, setTagIds]   = useState([])
  const [image, setImage]     = useState(null)
  const [saving, setSaving]   = useState(false)

  // Populate form when post loads
  useEffect(() => {
    if (!post) return
    setTitle(post.title || '')
    setContent(post.content || '')
    setExcerpt(post.excerpt || '')
    setCategory(post.category?.id || '')
    setTagIds(post.tags?.map((t) => t.id) || [])
  }, [post])

  const categories = catData?.results ?? catData ?? []
  const tags       = tagData?.results ?? []

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required.'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('content', content)
      if (excerpt) fd.append('excerpt', excerpt)
      if (categoryId) fd.append('category', categoryId)
      tagIds.forEach((id) => fd.append('tag_ids', id))
      if (image) fd.append('featured_image', image)
      const { data: updated } = await postsApi.update(slug, fd)
      toast.success('Post updated!')
      navigate(`/blog/${updated.slug}`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
  if (!post) return <div className="container py-8"><p>Post not found.</p></div>

  return (
    <>
      <Helmet><title>Edit Post — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-[var(--color-brand-dark)] mb-6">Edit post</h1>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="form-group mb-0">
            <label htmlFor="title" className="form-label">Title <span className="required">*</span></label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="form-input text-xl font-bold" placeholder="Post title…" />
          </div>
          <div className="form-group mb-0">
            <label htmlFor="excerpt" className="form-label">Excerpt</label>
            <textarea id="excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
              className="form-input resize-none" maxLength={500} />
          </div>
          <div className="form-group mb-0">
            <label htmlFor="category" className="form-label">Category</label>
            <select id="category" value={categoryId} onChange={(e) => setCategory(e.target.value)} className="form-input">
              <option value="">Select…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <p className="form-label mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => setTagIds((p) => p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])}
                    aria-pressed={tagIds.includes(t.id)}
                    className={`badge cursor-pointer ${tagIds.includes(t.id) ? 'badge-green' : 'badge-gray hover:badge-green'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ImageUploader label="Featured image" currentUrl={post.featured_image_url} onSelect={setImage} />
          <div>
            <p className="form-label mb-2">Content <span className="required">*</span></p>
            <RichTextEditor value={content} onChange={setContent} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </>
  )
}
