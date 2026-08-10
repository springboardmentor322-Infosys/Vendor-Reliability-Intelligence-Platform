import { useState } from 'react'

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3L21 21M10.58 10.58C10.21 10.95 10 11.45 10 12C10 13.1 10.9 14 12 14C12.55 14 13.05 13.79 13.42 13.42M17.94 17.94C16.23 19.24 14.21 20 12 20C5 20 1 12 1 12C2.24 9.24 4.47 6.94 7.06 5.34M9.9 4.24C10.59 4.08 11.29 4 12 4C19 4 23 12 23 12C22.39 13.23 21.54 14.32 20.53 15.24"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  error = false,
  errorMessage,
  className = 'auth-field auth-field-floating auth-field-password',
  autoComplete,
  minLength,
  required = true,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={className}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder=" "
        aria-invalid={error}
        className={error ? 'input-error' : undefined}
      />
      <label htmlFor={id}>{label}</label>
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      {errorMessage && <span className="field-error">{errorMessage}</span>}
    </div>
  )
}
