export default function AuthAlert({ message, type = 'error' }) {
  if (!message) {
    return null
  }

  return (
    <div className={`auth-alert auth-alert-${type}`} role="alert" aria-live="polite">
      {message}
    </div>
  )
}
