export const VENDOR_STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected']

export const STATUS_PILL_CLASS = {
  Pending: 'status-pill--neutral',
  'Under Review': 'status-pill--warn',
  Approved: 'status-pill--good',
  Rejected: 'status-pill--danger',
}

export function getStatusPillClass(status) {
  return STATUS_PILL_CLASS[status] ?? 'status-pill--neutral'
}

export function getNextApprovalActions(status) {
  switch (status) {
    case 'Pending':
      return [{ label: 'Move to Under Review', status: 'Under Review' }]
    case 'Under Review':
      return [
        { label: 'Approve', status: 'Approved', variant: 'primary' },
        { label: 'Reject', status: 'Rejected', variant: 'danger' },
      ]
    default:
      return []
  }
}

export function canManageApprovals(role) {
  return role === 'Administrator' || role === 'Procurement Manager'
}

export const APPROVAL_PIPELINE = ['Pending', 'Under Review', 'Approved']

export function getPipelineStepState(currentStatus, step) {
  const order = ['Pending', 'Under Review', 'Approved', 'Rejected']
  const currentIndex = order.indexOf(currentStatus)
  const stepIndex = order.indexOf(step)

  if (currentStatus === 'Rejected' && step === 'Approved') {
    return 'rejected'
  }
  if (stepIndex < currentIndex || (currentStatus === 'Approved' && step === 'Approved')) {
    return 'complete'
  }
  if (step === currentStatus || (currentStatus === 'Rejected' && step === 'Under Review')) {
    return 'active'
  }
  return 'upcoming'
}

export const DOCUMENT_TYPES = [
  'Business License',
  'Tax Certificate',
  'Insurance Certificate',
  'Compliance Certificate',
  'Other',
]

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
