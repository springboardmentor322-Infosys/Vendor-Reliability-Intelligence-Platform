import api from './client'

export async function fetchSpendOverTime() {
  const { data } = await api.get('/analytics/spend-over-time')
  return data
}

export async function fetchVendorCategoryDistribution() {
  const { data } = await api.get('/analytics/vendor-category-distribution')
  return data
}

export async function fetchProcurementCostTrends() {
  const { data } = await api.get('/analytics/procurement-cost-trends')
  return data
}

export async function fetchDeliveryPerformanceSummary() {
  const { data } = await api.get('/analytics/delivery-performance-summary')
  return data
}
