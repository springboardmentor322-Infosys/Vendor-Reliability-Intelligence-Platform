import api from './client'

export async function fetchAuditLogs(params = {}) {
  const { data } = await api.get('/audit-logs', { params })
  return data
}
