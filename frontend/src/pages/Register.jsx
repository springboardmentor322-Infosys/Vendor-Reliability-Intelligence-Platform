import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../context/AuthContext'
import {
  getEmailValidationError,
  getRegisterErrorMessage,
  isDuplicateEmailError,
  REGISTER_ROLES,
} from '../utils/auth'
import { getDashboardRouteForRole } from '../utils/roleRoutes'
import '../auth.css'

export default function Register() {
  const navigate = useNavigate()
  const { register, isAuthenticated, user, initializing } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Vendor')
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState(false)
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
    setEmailError(false)
    setEmailMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearErrors()

    const emailValidationError = getEmailValidationError(email)
    if (emailValidationError) {
      setEmailError(true)
      setEmailMessage(emailValidationError)
      return
    }

    setSubmitting(true)

    try {
      await register({ name, email: email.trim(), password, role })
      navigate(getDashboardRouteForRole(role))
    } catch (err) {
      setError(getRegisterErrorMessage(err))
      if (isDuplicateEmailError(err)) {
        setEmailError(true)
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

        <h1>Create account</h1>
        <p className="auth-subtitle">Join the Vendor Reliability Platform</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthAlert message={error} />

          {emailError && !emailMessage && (
            <p className="auth-hint">
              Already have an account? <Link to="/login">Sign in here</Link>
            </p>
          )}

          <div className="auth-field auth-field-floating">
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) clearErrors()
              }}
              required
              autoComplete="name"
              placeholder=" "
            />
            <label htmlFor="register-name">Full name</label>
          </div>

          <div className="auth-field auth-field-floating">
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) clearErrors()
              }}
              required
              autoComplete="email"
              placeholder=" "
              aria-invalid={emailError}
              className={emailError ? 'input-error' : undefined}
            />
            <label htmlFor="register-email">Email</label>
            {emailError && (
              <span className="field-error">
                {emailMessage || 'This email address is already in use.'}
              </span>
            )}
          </div>

          <PasswordInput
            id="register-password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) clearErrors()
            }}
            autoComplete="new-password"
            minLength={8}
          />

          <div className="auth-field">
            <label className="auth-label-top" htmlFor="register-role">
              Role
            </label>
            <select
              id="register-role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                if (error) clearErrors()
              }}
            >
              {REGISTER_ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={submitting} className={submitting ? 'is-loading' : undefined}>
            <span className="btn-spinner" aria-hidden="true" />
            <span>{submitting ? 'Creating account…' : 'Register'}</span>
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
