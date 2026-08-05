import api from './client'

export async function fetchPurchaseOrders(params = {}) {
  const { data } = await api.get('/purchase-orders', { params })
  return data
}

export async function fetchPurchaseOrder(id) {
  const { data } = await api.get(`/purchase-orders/${id}`)
  return data
}

export async function createPurchaseOrder(payload) {
  const { data } = await api.post('/purchase-orders', payload)
  return data
}

export async function updatePurchaseOrderStatus(id, payload) {
  const { data } = await api.put(`/purchase-orders/${id}/status`, payload)
  return data
}

export async function uploadPODocument(id, docType, file) {
  const formData = new FormData()
  formData.append('doc_type', docType)
  formData.append('file', file)
  const { data } = await api.post(`/purchase-orders/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function fetchPODocuments(id) {
  const { data } = await api.get(`/purchase-orders/${id}/documents`)
  return data
}
