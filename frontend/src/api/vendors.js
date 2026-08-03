import api from './client'

export async function fetchVendorCategories() {
  const { data } = await api.get('/vendor-categories')
  return data
}

export async function fetchVendors(params = {}) {
  const { data } = await api.get('/vendors', { params })
  return data
}

export async function fetchVendor(vendorId) {
  const { data } = await api.get(`/vendors/${vendorId}`)
  return data
}

export async function fetchMyVendor() {
  const { data } = await api.get('/vendors/me')
  return data
}

export async function createVendor(payload) {
  const { data } = await api.post('/vendors', payload)
  return data
}

export async function updateVendor(vendorId, payload) {
  const { data } = await api.put(`/vendors/${vendorId}`, payload)
  return data
}

export async function updateVendorStatus(vendorId, payload) {
  const { data } = await api.put(`/vendors/${vendorId}/status`, payload)
  return data
}

export async function fetchVendorDocuments(vendorId) {
  const { data } = await api.get(`/vendors/${vendorId}/documents`)
  return data
}

export async function uploadVendorDocument(vendorId, docType, file) {
  const formData = new FormData()
  formData.append('doc_type', docType)
  formData.append('file', file)
  const { data } = await api.post(`/vendors/${vendorId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
