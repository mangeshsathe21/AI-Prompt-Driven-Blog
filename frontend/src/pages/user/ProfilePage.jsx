/**
 * ProfilePage — view and edit own profile + change password
 */
import { useState } from 'react'
import { Helmet } from '@vuer-ai/react-helmet-async'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { useForm } from '@/hooks/useForm'
import { validators } from '@/utils/validators'
import ImageUploader from '@/components/ui/ImageUploader'
import { formatDate, roleLabel } from '@/utils/formatters'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState('profile') // 'profile' | 'password'

  // ---- Profile form ----
  const profileForm = useForm({
    initialValues: {
      first_name: user?.first_name || '',
      last_name:  user?.last_name  || '',
      username:   user?.username   || '',
      phone:      user?.phone      || '',
      bio:        user?.bio        || '',
      avatar:     null,
      profile: {
        city:         user?.profile?.city         || '',
        state:        user?.profile?.state        || '',
        country:      user?.profile?.country      || 'India',
        garden_type:  user?.profile?.garden_type  || '',
      },
    },
    validate: (v) => {
      const errs = {}
      if (!v.username || v.username.trim().length < 3) errs.username = 'Username must be at least 3 characters.'
      return errs
    },
    onSubmit: async (vals) => {
      const formData = new FormData()
      Object.entries(vals).forEach(([k, v]) => {
        if (k === 'avatar' && v) formData.append('avatar', v)
        else if (k === 'profile') formData.append('profile', JSON.stringify(v))
        else if (v !== null && v !== undefined) formData.append(k, v)
      })
      const { data } = await authApi.updateProfile(formData)
      updateUser(data)
      toast.success('Profile updated!')
    },
  })

  // ---- Password form ----
  const passwordForm = useForm({
    initialValues: { old_password: '', new_password: '', new_password_confirm: '' },
    validate: (v) => {
      const errs = {}
      if (!v.old_password) errs.old_password = 'Required.'
      const pwErr = validators.passwordStrength(v.new_password)
      if (pwErr) errs.new_password = pwErr
      const matchErr = validators.passwordMatch(v.new_password)(v.new_password_confirm)
      if (matchErr) errs.new_password_confirm = matchErr
      return errs
    },
    onSubmit: async ({ old_password, new_password, new_password_confirm }) => {
      await authApi.changePassword(old_password, new_password, new_password_confirm)
      toast.success('Password changed successfully.')
      passwordForm.reset()
    },
  })

  return (
    <>
      <Helmet><title>My Profile — GreenTalk</title></Helmet>
      <div className="container py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--color-green-200)] flex items-center justify-center text-2xl font-bold text-[var(--color-brand-dark)]">
            {user?.full_name?.[0] || user?.username?.[0] || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">{user?.full_name || user?.username}</h1>
            <div className="flex gap-2 mt-1">
              <span className="badge badge-green">{roleLabel(user?.role)}</span>
              {user?.is_verified
                ? <span className="badge badge-blue">✓ Verified</span>
                : <span className="badge badge-yellow">⚠ Unverified</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
          {['profile', 'password'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize
                ${tab === t ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}>
              {t === 'profile' ? 'Edit Profile' : 'Change Password'}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <form onSubmit={profileForm.handleSubmit} noValidate className="flex flex-col gap-4">
            <ImageUploader
              label="Profile picture"
              currentUrl={user?.avatar_url}
              onSelect={(file) => profileForm.setFieldValue('avatar', file)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: 'first_name', label: 'First name' },
                { id: 'last_name',  label: 'Last name' },
                { id: 'username',   label: 'Username', required: true },
                { id: 'phone',      label: 'Phone' },
              ].map(({ id, label, required }) => (
                <div key={id} className="form-group mb-0">
                  <label htmlFor={id} className="form-label">{label}{required && <span className="required"> *</span>}</label>
                  <input id={id} name={id} type="text" value={profileForm.values[id]}
                    onChange={profileForm.handleChange} onBlur={profileForm.handleBlur}
                    className={`form-input ${profileForm.errors[id] ? 'error' : ''}`} />
                  {profileForm.errors[id] && <p className="form-error">{profileForm.errors[id]}</p>}
                </div>
              ))}
            </div>
            <div className="form-group mb-0">
              <label htmlFor="bio" className="form-label">Bio</label>
              <textarea id="bio" name="bio" rows={3} value={profileForm.values.bio}
                onChange={profileForm.handleChange} className="form-input resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'city', label: 'City' },
                { id: 'state', label: 'State' },
                { id: 'country', label: 'Country' },
              ].map(({ id, label }) => (
                <div key={id} className="form-group mb-0">
                  <label htmlFor={`profile.${id}`} className="form-label">{label}</label>
                  <input id={`profile.${id}`} name={`profile.${id}`} type="text"
                    value={profileForm.values.profile[id]}
                    onChange={(e) => profileForm.setFieldValue('profile', { ...profileForm.values.profile, [id]: e.target.value })}
                    className="form-input" />
                </div>
              ))}
            </div>
            <div className="form-group mb-0">
              <label htmlFor="garden_type" className="form-label">Garden type</label>
              <select id="garden_type" value={profileForm.values.profile.garden_type}
                onChange={(e) => profileForm.setFieldValue('profile', { ...profileForm.values.profile, garden_type: e.target.value })}
                className="form-input">
                <option value="">Select…</option>
                <option value="home">Home garden</option>
                <option value="open_land">Open land</option>
                <option value="both">Both</option>
              </select>
            </div>
            <button type="submit" disabled={profileForm.isSubmitting} className="btn btn-primary self-start">
              {profileForm.isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={passwordForm.handleSubmit} noValidate className="flex flex-col gap-4 max-w-sm">
            {[
              { id: 'old_password', label: 'Current password', autoComplete: 'current-password' },
              { id: 'new_password', label: 'New password',     autoComplete: 'new-password' },
              { id: 'new_password_confirm', label: 'Confirm new password', autoComplete: 'new-password' },
            ].map(({ id, label, autoComplete }) => (
              <div key={id} className="form-group mb-0">
                <label htmlFor={id} className="form-label">{label} <span className="required">*</span></label>
                <input id={id} name={id} type="password" autoComplete={autoComplete}
                  value={passwordForm.values[id]} onChange={passwordForm.handleChange} onBlur={passwordForm.handleBlur}
                  className={`form-input ${passwordForm.errors[id] ? 'error' : ''}`} aria-invalid={!!passwordForm.errors[id]} />
                {passwordForm.errors[id] && <p className="form-error" role="alert">{passwordForm.errors[id]}</p>}
              </div>
            ))}
            <button type="submit" disabled={passwordForm.isSubmitting} className="btn btn-primary self-start">
              {passwordForm.isSubmitting ? 'Changing…' : 'Change password'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
