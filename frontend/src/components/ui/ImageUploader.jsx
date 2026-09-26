/**
 * ImageUploader — drag-and-drop + click file input with client-side validation
 *
 * SECURITY: validates file type (MIME + extension) and size client-side
 * before the file is attached to the form. Server also validates independently.
 */
import { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { validators } from '@/utils/validators'

export default function ImageUploader({ onSelect, currentUrl, label = 'Upload Image' }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(currentUrl || null)
  const [error, setError]     = useState(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (!file) return
    const err = validators.imageFile(file)
    if (err) { setError(err); return }
    setError(null)
    setPreview(URL.createObjectURL(file))
    onSelect(file)
  }

  return (
    <div>
      {label && <p className="form-label mb-2">{label}</p>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          handleFile(e.dataTransfer.files[0])
        }}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${dragging ? 'border-[var(--color-brand)] bg-[var(--color-green-50)]' : 'border-[var(--color-border)] hover:border-[var(--color-brand-light)]'}`}
        role="button"
        aria-label="Click or drag an image to upload"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-48 object-contain rounded-lg" />
        ) : (
          <>
            <svg className="w-10 h-10 text-[var(--color-brand-light)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-[var(--color-muted)]">Click or drag image here</p>
            <p className="text-xs text-[var(--color-muted)] mt-1">JPG, PNG, WebP, GIF · Max 5 MB</p>
          </>
        )}
      </div>
      {preview && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPreview(null); onSelect(null) }}
          className="btn btn-ghost btn-sm mt-2"
        >
          Remove image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      {error && <p className="form-error mt-1">{error}</p>}
    </div>
  )
}

ImageUploader.propTypes = {
  onSelect:   PropTypes.func.isRequired,
  currentUrl: PropTypes.string,
  label:      PropTypes.string,
}
