import { useState } from 'react'
import { openStoredFile } from '../api/files'
import { getErrorMessage } from '../utils/auth'

export default function DocumentViewLink({ href, children = 'View', className }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!href) return <span>—</span>

  const handleClick = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await openStoredFile(href)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to open file'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <span>
      <a href={href} className={className} onClick={handleClick}>
        {busy ? 'Opening…' : children}
      </a>
      {error ? <span className="form-error" style={{ display: 'block' }}>{error}</span> : null}
    </span>
  )
}
