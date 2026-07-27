import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import { useAuth } from '../context/AuthContext'
import { ROLES, getRegisterErrorMessage, isDuplicateEmailError } from '../utils/auth'
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
    <main className="auth-page">
      <section className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Join the Vendor Reliability Platform</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthAlert message={error} />

          {emailError && (
            <p className="auth-hint">
              Already have an account? <Link to="/login">Sign in here</Link>
            </p>
          )}

          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) clearErrors()
              }}
              required
              autoComplete="name"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) clearErrors()
              }}
              required
              autoComplete="email"
              aria-invalid={emailError}
              className={emailError ? 'input-error' : undefined}
            />
            {emailError && (
              <span className="field-error">This email address is already in use.</span>
            )}
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) clearErrors()
              }}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label>
            Role
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                if (error) clearErrors()
              }}
            >
              {ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
