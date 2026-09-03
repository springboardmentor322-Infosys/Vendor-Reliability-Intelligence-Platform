import api from './client'

export async function fetchAdminUsers(params = {}) {
  const { data } = await api.get('/admin/users', { params })
  return data
}

export async function updateAdminUser(userId, payload) {
  const { data } = await api.patch(`/admin/users/${userId}`, payload)
  return data
}

export async function fetchSystemSettings() {
  const { data } = await api.get('/admin/settings')
  return data
}

export async function updateSystemSettings(payload) {
  const { data } = await api.put('/admin/settings', payload)
  return data
}

export async function fetchSystemHealth() {
  const { data } = await api.get('/admin/health')
  return data
}

export async function fetchPoApprovalTrails() {
  const { data } = await api.get('/admin/po-approval-trails')
  return data
}
