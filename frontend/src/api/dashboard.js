import api from './client'

export async function fetchAdminDashboard() {
  const { data } = await api.get('/dashboard/admin')
  return data
}

export async function fetchVendorDashboard() {
  const { data } = await api.get('/dashboard/vendor')
  return data
}

export async function fetchFinanceDashboard() {
  const { data } = await api.get('/dashboard/finance')
  return data
}

export async function fetchProcurementDashboard() {
  const { data } = await api.get('/dashboard/procurement')
  return data
}

export async function fetchSupplyChainDashboard() {
  const { data } = await api.get('/dashboard/supply-chain')
  return data
}

export async function fetchAuditorDashboard() {
  const { data } = await api.get('/dashboard/auditor')
  return data
}
