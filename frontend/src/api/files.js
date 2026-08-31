import api from './client'

export async function openStoredFile(fileUrl) {
  if (!fileUrl) {
    throw new Error('No file available')
  }

  const response = await api.get(fileUrl, { responseType: 'blob' })
  const data = response.data
  const contentType = response.headers['content-type'] || data.type || 'application/octet-stream'

  if (contentType.includes('application/json') || contentType.includes('text/html')) {
    throw new Error('Unable to open file')
  }

  const blob = data instanceof Blob ? data : new Blob([data], { type: contentType })
  const typed = blob.type ? blob : new Blob([blob], { type: contentType })
  const url = URL.createObjectURL(typed)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.click()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
