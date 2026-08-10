import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../auth.css'

export default function ResetPassword() {
  const { token } = useParams()
  const { resetPasswordWithToken, isAuthenticated, initializing } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (initializing) {
    return (
      <main className="auth-page page-enter">
        <section className="auth-card">
          <p className="auth-subtitle">Loading…</p>
        </section>
      </main>
    )
  }

  if (!token) {
    return <Navigate to="/forgot-password" replace />
  }

  if (success) {
    return (
      <main className="auth-page page-enter">
        <section className="auth-card">
          <h1>Password updated</h1>
          <p className="auth-subtitle">Your password has been reset successfully.</p>
          <p className="auth-footer">
            <Link to="/login">Sign in with your new password</Link>
          </p>
        </section>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await resetPasswordWithToken(token, newPassword)
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password. Please request a new link.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page page-enter">
      <section className="auth-card">
        <div className="auth-card__brand">
          <div className="auth-card__logo" aria-hidden="true">
            VQ
          </div>
          <span className="auth-card__brand-name">VendorIQ</span>
        </div>

        <h1>Set new password</h1>
        <p className="auth-subtitle">Choose a new password for your account</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthAlert message={error} />

          <PasswordInput
            id="reset-password"
            label="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
          />

          <PasswordInput
            id="reset-password-confirm"
            label="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
          />

          <button type="submit" disabled={submitting} className={submitting ? 'is-loading' : undefined}>
            <span className="btn-spinner" aria-hidden="true" />
            <span>{submitting ? 'Updating…' : 'Update password'}</span>
          </button>
        </form>

        <p className="auth-footer">
          Need a new link? <Link to="/forgot-password">Request another reset</Link>
        </p>
      </section>
    </main>
  )
}
