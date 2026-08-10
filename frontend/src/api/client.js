import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

let onUnauthorized = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

function isPublicAuthRequest(url = '') {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path))
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl = error.config?.url ?? ''

    if ((status === 401 || status === 403) && !isPublicAuthRequest(requestUrl) && onUnauthorized) {
      onUnauthorized(status)
    }

    return Promise.reject(error)
  },
)

export default api
