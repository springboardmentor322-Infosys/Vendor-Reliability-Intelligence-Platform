import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../auth.css'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user])

  const handleCancel = () => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setError('')
    setSuccess('')
    setEditing(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await updateProfile({ name, email })
      setSuccess('Profile updated successfully.')
      setEditing(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <h1>Profile</h1>
        <p className="auth-subtitle">Manage your account details</p>

        {editing ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label>
              Role
              <input type="text" value={user?.role ?? ''} disabled />
            </label>

            {error && <p className="auth-error">{error}</p>}
            {success && <p className="auth-success">{success}</p>}

            <div className="button-row">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="dashboard-profile">
              <p>
                <span>Name</span>
                <strong>{user?.name}</strong>
              </p>
              <p>
                <span>Email</span>
                <strong>{user?.email}</strong>
              </p>
              <p>
                <span>Role</span>
                <strong>{user?.role}</strong>
              </p>
            </div>

            {success && <p className="auth-success">{success}</p>}

            <button type="button" onClick={() => setEditing(true)}>
              Edit profile
            </button>
          </>
        )}
      </section>
    </main>
  )
}
