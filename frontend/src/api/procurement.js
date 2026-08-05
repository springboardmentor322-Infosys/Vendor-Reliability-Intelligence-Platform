import api from './client'

export async function fetchProcurementRequests(params = {}) {
  const { data } = await api.get('/procurement-requests', { params })
  return data
}

export async function fetchProcurementRequest(id) {
  const { data } = await api.get(`/procurement-requests/${id}`)
  return data
}

export async function createProcurementRequest(payload) {
  const { data } = await api.post('/procurement-requests', payload)
  return data
}

export async function approveProcurementRequest(id) {
  const { data } = await api.put(`/procurement-requests/${id}/approve`)
  return data
}

export async function rejectProcurementRequest(id, reason) {
  const { data } = await api.put(`/procurement-requests/${id}/reject`, { reason })
  return data
}
