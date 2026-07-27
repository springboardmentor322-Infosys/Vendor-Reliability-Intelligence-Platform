import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthAlert from '../components/AuthAlert'
import { useAuth } from '../context/AuthContext'
import { getLoginErrorMessage, isInvalidLoginError } from '../utils/auth'
import '../auth.css'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ email: false, password: false })
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
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
      await login(email, password)
      navigate('/dashboard')
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
    <main className="auth-page">
      <section className="auth-card">
        <h1>Sign in</h1>
        <p className="auth-subtitle">Vendor Reliability Platform</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthAlert message={error} />

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
              aria-invalid={fieldErrors.email}
              className={fieldErrors.email ? 'input-error' : undefined}
            />
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
              autoComplete="current-password"
              aria-invalid={fieldErrors.password}
              className={fieldErrors.password ? 'input-error' : undefined}
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          No account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  )
}
