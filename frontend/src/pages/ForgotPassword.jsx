import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import { useAuth } from '../context/AuthContext'
import { getEmailValidationError, getErrorMessage } from '../utils/auth'
import '../auth.css'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      const message = await forgotPassword(email.trim())
      setSuccess(message)
      setEmail('')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send reset email. Please try again.'))
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

        <h1>Forgot password</h1>
        <p className="auth-subtitle">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthAlert message={error} />
          {success && <p className="auth-success">{success}</p>}

          <div className="auth-field auth-field-floating">
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error || emailMessage) {
                  setError('')
                  setEmailMessage('')
                }
              }}
              required
              autoComplete="email"
              placeholder=" "
              aria-invalid={Boolean(emailMessage)}
              className={emailMessage ? 'input-error' : undefined}
            />
            <label htmlFor="forgot-email">Email</label>
            {emailMessage && <span className="field-error">{emailMessage}</span>}
          </div>

          <button type="submit" disabled={submitting} className={submitting ? 'is-loading' : undefined}>
            <span className="btn-spinner" aria-hidden="true" />
            <span>{submitting ? 'Sending…' : 'Send reset link'}</span>
          </button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  )
}
