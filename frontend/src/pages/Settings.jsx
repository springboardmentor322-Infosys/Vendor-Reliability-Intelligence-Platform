import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getEmailValidationError, getErrorMessage } from '../utils/auth'
import '../auth.css'
import '../dashboard-admin.css'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setEmailMessage('')

    const emailValidationError = getEmailValidationError(email)
    if (emailValidationError) {
      setEmailMessage(emailValidationError)
      return
    }

    setSubmitting(true)
    try {
      await updateProfile({ name, email: email.trim() })
      setSuccess('Settings saved successfully.')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account preferences.</p>
        </div>
      </header>

      <section className="list-card settings-card">
        <form className="auth-form settings-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field auth-field-floating">
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              placeholder=" "
            />
            <label htmlFor="settings-name">Display name</label>
          </div>

          <div className="auth-field auth-field-floating">
            <input
              id="settings-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (emailMessage) setEmailMessage('')
              }}
              required
              autoComplete="email"
              placeholder=" "
              aria-invalid={Boolean(emailMessage)}
              className={emailMessage ? 'input-error' : undefined}
            />
            <label htmlFor="settings-email">Email address</label>
            {emailMessage && <span className="field-error">{emailMessage}</span>}
          </div>

          <div className="settings-readonly">
            <span className="settings-readonly__label">Role</span>
            <strong>{user?.role}</strong>
          </div>

          <div className="settings-section">
            <h3>Password</h3>
            <p className="auth-subtitle">
              To change your password, request a secure reset link by email.
            </p>
            <Link to="/forgot-password" className="dashboard-admin-btn dashboard-admin-btn--ghost">
              Change password
            </Link>
          </div>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" disabled={submitting} className="dashboard-admin-btn dashboard-admin-btn--primary">
            {submitting ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </section>
    </section>
  )
}
