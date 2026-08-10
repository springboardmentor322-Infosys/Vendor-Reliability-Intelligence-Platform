import api from './client'

export async function submitSupportTicket(payload) {
  const { data } = await api.post('/support/tickets', payload)
  return data
}
