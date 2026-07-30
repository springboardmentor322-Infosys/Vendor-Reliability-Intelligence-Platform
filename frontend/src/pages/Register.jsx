import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import { useAuth } from '../context/AuthContext'
import { REGISTER_ROLES, getRegisterErrorMessage, isDuplicateEmailError } from '../utils/auth'
import '../auth.css'

export default function Register() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Vendor')
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const clearErrors = () => {
    setError('')
    setEmailError(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearErrors()
    setSubmitting(true)

    try {
      await register({ name, email, password, role })
      navigate('/dashboard')
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

          {emailError && (
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
              <span className="field-error">This email address is already in use.</span>
            )}
          </div>

          <div className="auth-field auth-field-floating">
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) clearErrors()
              }}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder=" "
            />
            <label htmlFor="register-password">Password</label>
          </div>

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
