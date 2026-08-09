import api from './client'

export async function fetchContracts(params = {}) {
  const { data } = await api.get('/contracts/', { params })
  return data
}

export async function fetchContract(id) {
  const { data } = await api.get(`/contracts/${id}`)
  return data
}

export async function createContract(contractData, file = null) {
  const formData = new FormData()
  formData.append('contract_data', JSON.stringify(contractData))
  if (file) {
    formData.append('file', file)
  }
  const { data } = await api.post('/contracts/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateContract(id, updates) {
  const { data } = await api.put(`/contracts/${id}`, updates)
  return data
}

export async function uploadContractFile(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post(`/contracts/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
