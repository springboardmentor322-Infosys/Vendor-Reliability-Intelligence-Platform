import api from './client'

function filenameFromDisposition(header, fallback) {
  if (!header) return fallback
  const match = /filename="?([^"]+)"?/i.exec(header)
  return match?.[1] || fallback
}

export async function downloadReport(reportType, format = 'pdf') {
  try {
    const { data, headers } = await api.get(`/reports/${reportType}`, {
      params: { format },
      responseType: 'blob',
    })

    const fallback = `${reportType}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`
    const filename = filenameFromDisposition(headers['content-disposition'], fallback)
    const blob = new Blob([data], { type: headers['content-type'] || 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return filename
  } catch (error) {
    const blob = error?.response?.data
    if (blob instanceof Blob) {
      const text = await blob.text()
      try {
        error.response.data = JSON.parse(text)
      } catch {
        error.response.data = { detail: text || 'Failed to generate report' }
      }
    }
    throw error
  }
}
