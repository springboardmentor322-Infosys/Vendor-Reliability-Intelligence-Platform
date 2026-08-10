import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { setUnauthorizedHandler } from '../api/client'
import { TOKEN_STORAGE_KEY } from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common.Authorization
  }, [])

  const persistToken = useCallback((accessToken) => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
    setToken(accessToken)
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
  }, [])

  const fetchMe = useCallback(async (accessToken) => {
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setUser(data)
    return data
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  useEffect(() => {
    setUnauthorizedHandler((status) => {
      clearSession()
      navigate('/login', {
        replace: true,
        state: {
          sessionExpired: status === 401,
          accessDenied: status === 403,
        },
      })
    })

    return () => setUnauthorizedHandler(null)
  }, [clearSession, navigate])

  useEffect(() => {
    async function rehydrateSession() {
      const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)
      if (!storedToken) {
        setInitializing(false)
        return
      }

      api.defaults.headers.common.Authorization = `Bearer ${storedToken}`

      try {
        const currentUser = await fetchMe(storedToken)
        setToken(storedToken)
        setUser(currentUser)
      } catch {
        clearSession()
      } finally {
        setInitializing(false)
      }
    }

    rehydrateSession()
  }, [clearSession, fetchMe])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    persistToken(data.access_token)
    return fetchMe(data.access_token)
  }, [fetchMe, persistToken])

  const register = useCallback(async (payload) => {
    await api.post('/auth/register', payload)
    const { data } = await api.post('/auth/login', { email: payload.email, password: payload.password })
    persistToken(data.access_token)
    return fetchMe(data.access_token)
  }, [fetchMe, persistToken])

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.patch('/auth/me', payload)
    setUser(data)
    return data
  }, [])

  const forgotPassword = useCallback(async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data.message
  }, [])

  const resetPasswordWithToken = useCallback(async (resetToken, newPassword) => {
    await api.post(`/auth/reset-password/${resetToken}`, { new_password: newPassword })
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      login,
      register,
      updateProfile,
      forgotPassword,
      resetPasswordWithToken,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [
      token,
      user,
      initializing,
      login,
      register,
      updateProfile,
      forgotPassword,
      resetPasswordWithToken,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
