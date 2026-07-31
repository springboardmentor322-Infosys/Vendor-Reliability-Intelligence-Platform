import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common.Authorization
    }
  }, [token])

  const fetchMe = async (accessToken) => {
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setUser(data)
    return data
  }

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.access_token)
    return fetchMe(data.access_token)
  }

  const register = async (payload) => {
    await api.post('/auth/register', payload)
    await login(payload.email, payload.password)
  }

  const updateProfile = async (payload) => {
    const { data } = await api.patch('/auth/me', payload)
    setUser(data)
    return data
  }

  const resetPassword = async (payload) => {
    await api.post('/auth/reset-password', payload)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      register,
      updateProfile,
      resetPassword,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token, user],
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
