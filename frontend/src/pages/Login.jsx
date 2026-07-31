import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import { useAuth } from '../context/AuthContext'
import { getLoginErrorMessage, isInvalidLoginError } from '../utils/auth'
import '../auth.css'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ email: false, password: false })
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    if (user?.role === 'Vendor') {
      return <Navigate to="/vendor-dashboard" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  const clearErrors = () => {
    setError('')
    setFieldErrors({ email: false, password: false })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearErrors()
    setSubmitting(true)

    try {
      const currentUser = await login(email, password)
      if (currentUser?.role === 'Vendor') {
        navigate('/vendor-dashboard')
      } else {
        navigate('/dashboard')
      }
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
                if (error) clearErrors()
              }}
              required
              autoComplete="email"
              placeholder=" "
              aria-invalid={fieldErrors.email}
              className={fieldErrors.email ? 'input-error' : undefined}
            />
            <label htmlFor="login-email">Email</label>
            {fieldErrors.email && (
              <span className="field-error">Please check your email address.</span>
            )}
          </div>

          <div className="auth-field auth-field-floating">
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) clearErrors()
              }}
              required
              autoComplete="current-password"
              placeholder=" "
              aria-invalid={fieldErrors.password}
              className={fieldErrors.password ? 'input-error' : undefined}
            />
            <label htmlFor="login-password">Password</label>
            {fieldErrors.password && (
              <span className="field-error">Please check your password.</span>
            )}
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
