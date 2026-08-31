import api from './client'

export async function fetchMessageHistory(params = {}) {
  const { data } = await api.get('/messages', { params })
  return data
}

export async function fetchMessages(threadType, referenceId) {
  const { data } = await api.get(`/messages/${threadType}/${referenceId}`)
  return data
}

export async function postMessage(payload) {
  const { data } = await api.post('/messages', payload)
  return data
}
