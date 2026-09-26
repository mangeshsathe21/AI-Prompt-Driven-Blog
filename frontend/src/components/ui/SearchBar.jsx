/**
 * SearchBar — controlled search input with debounce
 * Props: value, onChange, onSubmit, placeholder
 */
import { useRef } from 'react'
import PropTypes from 'prop-types'

export default function SearchBar({ value, onChange, onSubmit, placeholder = 'Search posts…' }) {
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(value)
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative flex w-full">
      <label htmlFor="search-input" className="sr-only">{placeholder}</label>
      <input
        id="search-input"
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="form-input pr-12 rounded-r-none border-r-0"
        aria-label={placeholder}
      />
      <button
        type="submit"
        aria-label="Submit search"
        className="btn btn-primary rounded-l-none px-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  )
}

SearchBar.propTypes = {
  value:       PropTypes.string.isRequired,
  onChange:    PropTypes.func.isRequired,
  onSubmit:    PropTypes.func,
  placeholder: PropTypes.string,
}
