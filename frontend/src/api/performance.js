import api from './client'

export async function fetchVendorsPerformance() {
  const { data } = await api.get('/vendors/performance')
  return data
}

export async function fetchVendorPerformance(vendorId) {
  const { data } = await api.get(`/vendors/${vendorId}/performance`)
  return data
}

export async function fetchVendorReliabilityScore(vendorId) {
  const { data } = await api.get(`/vendors/${vendorId}/reliability-score`)
  return data
}

export async function fetchVendorRanking() {
  const { data } = await api.get('/vendors/ranking')
  return data
}
