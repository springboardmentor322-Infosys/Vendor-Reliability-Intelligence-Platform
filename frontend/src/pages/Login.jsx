import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../context/AuthContext'
import {
  getEmailValidationError,
  getLoginErrorMessage,
  isInvalidLoginError,
} from '../utils/auth'
import { getDashboardRouteForRole } from '../utils/roleRoutes'
import '../auth.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, user, initializing } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(
    location.state?.sessionExpired
      ? 'Your session has expired. Please sign in again.'
      : location.state?.accessDenied
        ? 'Access denied. Please sign in again.'
        : '',
  )
  const [fieldErrors, setFieldErrors] = useState({ email: false, password: false })
  const [emailMessage, setEmailMessage] = useState('')
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

  if (isAuthenticated) {
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />
  }

  const clearErrors = () => {
    setError('')
    setFieldErrors({ email: false, password: false })
    setEmailMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearErrors()

    const emailValidationError = getEmailValidationError(email)
    if (emailValidationError) {
      setFieldErrors({ email: true, password: false })
      setEmailMessage(emailValidationError)
      return
    }

    setSubmitting(true)

    try {
      const currentUser = await login(email.trim(), password)
      navigate(getDashboardRouteForRole(currentUser?.role))
    } catch (err) {
      setError(getLoginErrorMessage(err))
      if (isInvalidLoginError(err)) {
        setFieldErrors({ email: true, password: true })
      }
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

        <h1>Sign in</h1>
        <p className="auth-subtitle">Vendor Reliability Platform</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthAlert message={error} />

          <div className="auth-field auth-field-floating">
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error || emailMessage) clearErrors()
              }}
              required
              autoComplete="email"
              placeholder=" "
              aria-invalid={fieldErrors.email}
              className={fieldErrors.email ? 'input-error' : undefined}
            />
            <label htmlFor="login-email">Email</label>
            {fieldErrors.email && emailMessage && (
              <span className="field-error">{emailMessage}</span>
            )}
            {fieldErrors.email && !emailMessage && (
              <span className="field-error">Please check your email address.</span>
            )}
          </div>

          <PasswordInput
            id="login-password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) clearErrors()
            }}
            error={fieldErrors.password}
            errorMessage={fieldErrors.password ? 'Please check your password.' : undefined}
            autoComplete="current-password"
          />

          <div className="auth-form__actions">
            <Link to="/forgot-password" className="auth-link-inline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={submitting} className={submitting ? 'is-loading' : undefined}>
            <span className="btn-spinner" aria-hidden="true" />
            <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
          </button>
        </form>

        <p className="auth-footer">
          No account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  )
}
