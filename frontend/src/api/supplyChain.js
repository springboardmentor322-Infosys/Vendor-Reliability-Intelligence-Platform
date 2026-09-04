import api from './client'

export async function fetchDeliveries(params = {}) {
  const { data } = await api.get('/deliveries', { params })
  return data
}

export async function fetchQualityInspections(params = {}) {
  const { data } = await api.get('/quality-inspections', { params })
  return data
}

export async function createQualityInspection(payload) {
  const { data } = await api.post('/quality-inspections', payload)
  return data
}
