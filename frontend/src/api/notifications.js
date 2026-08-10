import api from './client'

export async function fetchNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params })
  return data
}

export async function fetchUnreadNotificationCount() {
  const { data } = await api.get('/notifications/unread-count')
  return data.count
}

export async function markNotificationRead(notificationId) {
  const { data } = await api.patch(`/notifications/${notificationId}/read`)
  return data
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/mark-all-read')
}
