/**
 * RichTextEditor — TipTap-based rich text editor (MIT license)
 * Replaces React-Quill (maintenance slowed).
 *
 * Features: bold, italic, headings, bullet/ordered lists,
 *           blockquote, code block, links, images, character count.
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import PropTypes from 'prop-types'

const MAX_CHARS = 50000

export default function RichTextEditor({ value, onChange, placeholder = 'Start writing…' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: MAX_CHARS }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  })

  if (!editor) return null

  return (
    <div className="tiptap-editor">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[var(--color-border)] bg-[var(--color-green-50)]">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')} label="Bold">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')} label="Italic">
          <em>I</em>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })} label="Heading 2">
          H2
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })} label="Heading 3">
          H3
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')} label="Bullet list">
          • List
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')} label="Ordered list">
          1. List
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')} label="Blockquote">
          ❝
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')} label="Code block">
          {'</>'}
        </ToolBtn>
        <ToolBtn onClick={() => {
          const url = window.prompt('Enter URL:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }} active={editor.isActive('link')} label="Add link">
          🔗
        </ToolBtn>
        <ToolBtn onClick={() => {
          const url = window.prompt('Image URL:')
          if (url) editor.chain().focus().setImage({ src: url }).run()
        }} label="Insert image">
          🖼
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="Undo">↩</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="Redo">↪</ToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} className="prose max-w-none" />

      {/* Character count */}
      <div className="px-3 py-1.5 border-t border-[var(--color-border)] text-xs text-[var(--color-muted)] text-right">
        {editor.storage.characterCount.characters()} / {MAX_CHARS} characters
      </div>
    </div>
  )
}

function ToolBtn({ onClick, active, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`px-2 py-1 text-sm rounded border transition-colors
        ${active
          ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
          : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-green-100)]'
        }`}
    >
      {children}
    </button>
  )
}

ToolBtn.propTypes = {
  onClick:  PropTypes.func.isRequired,
  active:   PropTypes.bool,
  label:    PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

RichTextEditor.propTypes = {
  value:       PropTypes.string,
  onChange:    PropTypes.func.isRequired,
  placeholder: PropTypes.string,
}
