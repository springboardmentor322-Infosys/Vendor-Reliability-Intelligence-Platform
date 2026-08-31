import api from './client'

export async function fetchComplianceDocuments(params = {}) {
  const { data } = await api.get('/compliance-documents', { params })
  return data
}

export async function createComplianceDocument({ vendorId, documentType, documentName, expiresAt, notes, file }) {
  const formData = new FormData()
  formData.append('vendor_id', String(vendorId))
  formData.append('document_type', documentType)
  formData.append('document_name', documentName)
  if (expiresAt) formData.append('expires_at', expiresAt)
  if (notes) formData.append('notes', notes)
  formData.append('file', file)
  const { data } = await api.post('/compliance-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateComplianceDocument(documentId, payload) {
  const { data } = await api.put(`/compliance-documents/${documentId}`, payload)
  return data
}
