import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('qc_token'))
  const [isLoading, setIsLoading] = useState(true)

  // On mount, validate stored token by fetching /auth/me
  useEffect(() => {
    const storedToken = localStorage.getItem('qc_token')
    if (!storedToken) {
      setIsLoading(false)
      return
    }
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user || data)
        setToken(storedToken)
      })
      .catch(() => {
        localStorage.removeItem('qc_token')
        localStorage.removeItem('qc_user')
        setToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const { token: newToken, user: newUser } = data
    localStorage.setItem('qc_token', newToken)
    localStorage.setItem('qc_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('qc_token')
    localStorage.removeItem('qc_user')
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }, [])

  const isAuthenticated = !!token && !!user
  const isAdmin = isAuthenticated && (user?.role === 'admin' || user?.isAdmin === true)

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
