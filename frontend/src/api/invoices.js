import api from './client'

export async function fetchInvoices(params = {}) {
  const { data } = await api.get('/invoices', { params })
  return data
}

export async function fetchInvoiceSummary() {
  const { data } = await api.get('/invoices/summary')
  return data
}

export async function createInvoice(purchaseOrderId) {
  const { data } = await api.post('/invoices', { purchase_order_id: purchaseOrderId })
  return data
}

export async function updateInvoiceStatus(invoiceId, status) {
  const { data } = await api.put(`/invoices/${invoiceId}/status`, { status })
  return data
}
