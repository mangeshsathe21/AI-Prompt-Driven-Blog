import { useNavigate } from 'react-router-dom'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { purchaseApi } from '@/api/marketplace'
import { useForm } from '@/hooks/useForm'
import { validators } from '@/utils/validators'
import toast from 'react-hot-toast'

export default function CreatePurchaseListingPage() {
  const navigate = useNavigate()

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: { title: '', description: '', price: '', currency: 'INR', stock_quantity: '1' },
    validate: (v) => {
      const errs = {}
      if (!v.title.trim()) errs.title = 'Title is required.'
      const priceErr = validators.positiveNumber(v.price)
      if (priceErr || v.price === '') errs.price = priceErr || 'Price is required.'
      if (!v.stock_quantity || Number(v.stock_quantity) < 0) errs.stock_quantity = 'Stock must be 0 or more.'
      return errs
    },
    onSubmit: async (vals) => {
      await purchaseApi.create({ ...vals, price: vals.price, stock_quantity: Number(vals.stock_quantity) })
      toast.success('Listing created!')
      navigate('/listings')
    },
  })

  return (
    <>
      <Helmet><title>Sell a Plant — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-xl">
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] mb-6">Create Purchase Listing</h1>
        <form onSubmit={handleSubmit} noValidate className="card p-6 flex flex-col gap-4">
          <div className="form-group mb-0">
            <label htmlFor="title" className="form-label">Title <span className="required">*</span></label>
            <input id="title" name="title" type="text" value={values.title}
              onChange={handleChange} onBlur={handleBlur}
              className={`form-input ${errors.title ? 'error' : ''}`} />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          <div className="form-group mb-0">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea id="description" name="description" rows={3} value={values.description}
              onChange={handleChange} className="form-input resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label htmlFor="price" className="form-label">Price (₹) <span className="required">*</span></label>
              <input id="price" name="price" type="number" min="0" step="0.01" value={values.price}
                onChange={handleChange} onBlur={handleBlur}
                className={`form-input ${errors.price ? 'error' : ''}`} />
              {errors.price && <p className="form-error">{errors.price}</p>}
            </div>
            <div className="form-group mb-0">
              <label htmlFor="stock_quantity" className="form-label">Stock</label>
              <input id="stock_quantity" name="stock_quantity" type="number" min="0" value={values.stock_quantity}
                onChange={handleChange} onBlur={handleBlur}
                className={`form-input ${errors.stock_quantity ? 'error' : ''}`} />
              {errors.stock_quantity && <p className="form-error">{errors.stock_quantity}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Creating…' : 'List for sale'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </>
  )
}
