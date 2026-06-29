import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated, token } = useAuth()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000'
    const newSocket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    newSocket.on('connect', () => setIsConnected(true))
    newSocket.on('disconnect', () => setIsConnected(false))
    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message)
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated, token])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}

export default SocketContext
