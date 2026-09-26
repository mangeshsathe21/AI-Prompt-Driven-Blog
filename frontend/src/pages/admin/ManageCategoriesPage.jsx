import { useState } from 'react'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useApi } from '@/hooks/useApi'
import { categoriesApi, tagsApi } from '@/api/blog'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ManageCategoriesPage() {
  const [tab, setTab] = useState('categories')
  const [catModal, setCatModal] = useState(false)
  const [tagModal, setTagModal] = useState(false)
  const [catName, setCatName]   = useState('')
  const [catDesc, setCatDesc]   = useState('')
  const [tagName, setTagName]   = useState('')
  const [saving, setSaving]     = useState(false)

  const { data: catData, refetch: refetchCats } = useApi(() => categoriesApi.list(), [])
  const { data: tagData, refetch: refetchTags } = useApi(() => tagsApi.list({ page_size: 100 }), [])

  const categories = catData?.results ?? catData ?? []
  const tags       = tagData?.results ?? []

  async function createCategory() {
    if (!catName.trim()) { toast.error('Name required.'); return }
    setSaving(true)
    try {
      await categoriesApi.create({ name: catName, description: catDesc })
      toast.success('Category created!'); setCatModal(false); setCatName(''); setCatDesc(''); refetchCats()
    } finally { setSaving(false) }
  }

  async function deleteCategory(slug) {
    if (!window.confirm('Delete this category?')) return
    await categoriesApi.delete(slug); toast.success('Deleted.'); refetchCats()
  }

  async function createTag() {
    if (!tagName.trim()) { toast.error('Name required.'); return }
    setSaving(true)
    try {
      await tagsApi.create({ name: tagName })
      toast.success('Tag created!'); setTagModal(false); setTagName(''); refetchTags()
    } finally { setSaving(false) }
  }

  async function deleteTag(slug) {
    if (!window.confirm('Delete this tag?')) return
    await tagsApi.delete(slug); toast.success('Deleted.'); refetchTags()
  }

  return (
    <>
      <Helmet><title>Manage Categories & Tags — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] mb-6">Categories &amp; Tags</h1>

        <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
          {[['categories', 'Categories'], ['tags', 'Tags']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab === t ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-[var(--color-muted)]'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'categories' && (
          <>
            <button onClick={() => setCatModal(true)} className="btn btn-primary btn-sm mb-4">+ Add category</button>
            <div className="flex flex-col gap-2">
              {categories.map((c) => (
                <div key={c.id} className="card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{c.slug}</p>
                  </div>
                  <button onClick={() => deleteCategory(c.slug)} className="btn btn-danger btn-sm">Delete</button>
                </div>
              ))}
            </div>
            <Modal isOpen={catModal} onClose={() => setCatModal(false)} title="New Category">
              <div className="flex flex-col gap-4">
                <div className="form-group mb-0">
                  <label htmlFor="cat-name" className="form-label">Name <span className="required">*</span></label>
                  <input id="cat-name" type="text" value={catName} onChange={(e) => setCatName(e.target.value)} className="form-input" />
                </div>
                <div className="form-group mb-0">
                  <label htmlFor="cat-desc" className="form-label">Description</label>
                  <textarea id="cat-desc" rows={2} value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="form-input resize-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={createCategory} disabled={saving} className="btn btn-primary">
                    {saving ? 'Creating…' : 'Create'}
                  </button>
                  <button onClick={() => setCatModal(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {tab === 'tags' && (
          <>
            <button onClick={() => setTagModal(true)} className="btn btn-primary btn-sm mb-4">+ Add tag</button>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <div key={t.id} className="flex items-center gap-1 badge badge-gray px-3 py-1.5">
                  <span>{t.name}</span>
                  <button onClick={() => deleteTag(t.slug)} className="ml-1 text-[var(--color-danger)] hover:opacity-70 text-xs" aria-label={`Delete tag ${t.name}`}>✕</button>
                </div>
              ))}
            </div>
            <Modal isOpen={tagModal} onClose={() => setTagModal(false)} title="New Tag" size="sm">
              <div className="flex flex-col gap-4">
                <div className="form-group mb-0">
                  <label htmlFor="tag-name" className="form-label">Tag name <span className="required">*</span></label>
                  <input id="tag-name" type="text" value={tagName} onChange={(e) => setTagName(e.target.value)} className="form-input" />
                </div>
                <div className="flex gap-3">
                  <button onClick={createTag} disabled={saving} className="btn btn-primary">{saving ? 'Creating…' : 'Create'}</button>
                  <button onClick={() => setTagModal(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}
      </div>
    </>
  )
}
