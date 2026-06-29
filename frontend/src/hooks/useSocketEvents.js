import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../context/SocketContext'

export function useSocketEvents() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket) return

    const handlers = {
      'job:created': () => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
        queryClient.invalidateQueries({ queryKey: ['queueStats'] })
        queryClient.invalidateQueries({ queryKey: ['metrics'] })
      },
      'job:status_changed': ({ jobId } = {}) => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
        if (jobId) queryClient.invalidateQueries({ queryKey: ['job', jobId] })
        queryClient.invalidateQueries({ queryKey: ['queueStats'] })
        queryClient.invalidateQueries({ queryKey: ['metrics'] })
      },
      'worker:heartbeat': () => {
        queryClient.invalidateQueries({ queryKey: ['workers'] })
      },
      'worker:status_changed': () => {
        queryClient.invalidateQueries({ queryKey: ['workers'] })
      },
      'metrics:snapshot': (snapshot) => {
        if (snapshot) {
          queryClient.setQueryData(['metrics'], snapshot)
        }
        queryClient.invalidateQueries({ queryKey: ['metricsHistory'] })
      },
      'dlq:updated': () => {
        queryClient.invalidateQueries({ queryKey: ['deadLetter'] })
      },
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [socket, queryClient])
}
