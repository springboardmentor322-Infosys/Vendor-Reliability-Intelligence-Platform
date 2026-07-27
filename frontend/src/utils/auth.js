export const ROLES = [
  'Administrator',
  'Procurement Manager',
  'Vendor',
  'Finance Officer',
  'Auditor',
]

export function getErrorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(', ')
  }
  return fallback
}

export function getLoginErrorMessage(error) {
  const status = error?.response?.status

  if (status === 401) {
    return 'Invalid email or password. Please check your credentials and try again.'
  }
  if (status === 403) {
    return 'Your account is inactive. Contact an administrator.'
  }
  if (!error?.response) {
    return 'Unable to reach the server. Check that the backend is running and try again.'
  }

  return getErrorMessage(error, 'Sign in failed. Please try again.')
}

export function getRegisterErrorMessage(error) {
  const status = error?.response?.status
  const detail = getErrorMessage(error, '')

  if (status === 409 || detail.toLowerCase().includes('email already registered')) {
    return 'This email is already registered. Sign in or use a different email address.'
  }
  if (status === 422) {
    return getErrorMessage(error, 'Please check the form and try again.')
  }
  if (!error?.response) {
    return 'Unable to reach the server. Check that the backend is running and try again.'
  }

  return getErrorMessage(error, 'Registration failed. Please try again.')
}

export function isDuplicateEmailError(error) {
  const status = error?.response?.status
  const detail = getErrorMessage(error, '').toLowerCase()
  return status === 409 || detail.includes('email already registered')
}

export function isInvalidLoginError(error) {
  return error?.response?.status === 401
}
