import { useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { exchangeApi } from '@/api/marketplace'
import { useForm } from '@/hooks/useForm'
import { validators } from '@/utils/validators'
import toast from 'react-hot-toast'

export default function CreateExchangeListingPage() {
  const navigate = useNavigate()

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: {
      plant_name: '', quantity: '1', condition: 'seedling',
      listing_type: 'free', swap_for_text: '', location: '', description: '',
    },
    validate: (v) => {
      const errs = {}
      if (!v.plant_name.trim()) errs.plant_name = 'Plant name is required.'
      if (!v.quantity || Number(v.quantity) < 1) errs.quantity = 'Quantity must be at least 1.'
      if (v.listing_type === 'swap' && !v.swap_for_text.trim()) errs.swap_for_text = 'Specify what you want in return.'
      return errs
    },
    onSubmit: async (vals) => {
      const payload = { ...vals, quantity: Number(vals.quantity) }
      await exchangeApi.create(payload)
      toast.success('Exchange listing created!')
      navigate('/listings')
    },
  })

  return (
    <>
      <Helmet><title>Create Exchange Listing — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-xl">
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] mb-6">Create Exchange Listing</h1>
        <form onSubmit={handleSubmit} noValidate className="card p-6 flex flex-col gap-4">
          {[
            { id: 'plant_name', label: 'Plant name', required: true },
            { id: 'location', label: 'Your location', placeholder: 'e.g. Pune, Maharashtra' },
          ].map(({ id, label, required, placeholder }) => (
            <div key={id} className="form-group mb-0">
              <label htmlFor={id} className="form-label">{label}{required && <span className="required"> *</span>}</label>
              <input id={id} name={id} type="text" value={values[id]}
                onChange={handleChange} onBlur={handleBlur} placeholder={placeholder}
                className={`form-input ${errors[id] ? 'error' : ''}`} />
              {errors[id] && <p className="form-error" role="alert">{errors[id]}</p>}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label htmlFor="quantity" className="form-label">Quantity <span className="required">*</span></label>
              <input id="quantity" name="quantity" type="number" min="1" value={values.quantity}
                onChange={handleChange} onBlur={handleBlur}
                className={`form-input ${errors.quantity ? 'error' : ''}`} />
              {errors.quantity && <p className="form-error">{errors.quantity}</p>}
            </div>
            <div className="form-group mb-0">
              <label htmlFor="condition" className="form-label">Condition</label>
              <select id="condition" name="condition" value={values.condition} onChange={handleChange} className="form-input">
                {['seedling', 'sapling', 'mature', 'seeds'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group mb-0">
            <p className="form-label mb-2">Listing type <span className="required">*</span></p>
            <div className="flex gap-4">
              {[['free', 'Free'], ['swap', 'Swap']].map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="listing_type" value={val}
                    checked={values.listing_type === val} onChange={handleChange} />
                  {lbl}
                </label>
              ))}
            </div>
          </div>

          {values.listing_type === 'swap' && (
            <div className="form-group mb-0">
              <label htmlFor="swap_for_text" className="form-label">Swap for <span className="required">*</span></label>
              <textarea id="swap_for_text" name="swap_for_text" rows={2} value={values.swap_for_text}
                onChange={handleChange} onBlur={handleBlur}
                className={`form-input resize-none ${errors.swap_for_text ? 'error' : ''}`}
                placeholder="What plants or items would you like in return?" />
              {errors.swap_for_text && <p className="form-error">{errors.swap_for_text}</p>}
            </div>
          )}

          <div className="form-group mb-0">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea id="description" name="description" rows={3} value={values.description}
              onChange={handleChange} className="form-input resize-none" />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Creating…' : 'Create listing'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </>
  )
}
