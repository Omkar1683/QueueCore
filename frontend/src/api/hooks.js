import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './axios'

// ─── Jobs ────────────────────────────────────────────────────────────────────

export function useJobs(filters = {}) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) params.append(k, v) })
      const { data } = await api.get(`/jobs?${params.toString()}`)
      return data.data  // unwrap envelope: {jobs, total, page, pages}
    },
    placeholderData: (prev) => prev,
  })
}

export function useJob(id) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${id}`)
      return data.data  // job object
    },
    enabled: !!id,
    refetchInterval: 5000,  // poll while on detail page for live updates
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (jobData) => {
      const { data } = await api.post('/jobs', jobData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useCancelJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/jobs/${id}/cancel`)
      return data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job', id] })
    },
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/jobs/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

// ─── Workers ──────────────────────────────────────────────────────────────────

export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data } = await api.get('/workers')
      return data.data  // array of workers
    },
    refetchInterval: 15000,
  })
}

// ─── Queue Stats & Metrics ────────────────────────────────────────────────────

export function useQueueStats() {
  return useQuery({
    queryKey: ['queueStats'],
    queryFn: async () => {
      const { data } = await api.get('/queue/stats')
      return data.data  // {byStatus, jobTypeStats, throughput}
    },
    refetchInterval: 30000,
  })
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get('/queue/metrics')
      return data.data  // {queue: {pending,...}, workers, jobTypeStats, throughput}
    },
    refetchInterval: 30000,
  })
}

export function useMetricsHistory(minutes = 60) {
  return useQuery({
    queryKey: ['metricsHistory', minutes],
    queryFn: async () => {
      const { data } = await api.get(`/queue/metrics/history?minutes=${minutes}`)
      return data.data  // array of snapshots
    },
    refetchInterval: 60000,
  })
}

// ─── Dead Letter Queue ─────────────────────────────────────────────────────────

export function useDeadLetter(filters = {}) {
  return useQuery({
    queryKey: ['deadLetter', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) params.append(k, v) })
      const { data } = await api.get(`/dead-letter?${params.toString()}`)
      return data.data  // {jobs, total, page, pages}
    },
    placeholderData: (prev) => prev,
  })
}

export function useReplayJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/dead-letter/${id}/replay`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadLetter'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useDeleteDLQ() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/dead-letter/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadLetter'] })
    },
  })
}

// ─── Job Type Stats ───────────────────────────────────────────────────────────

export function useJobTypeStats() {
  return useQuery({
    queryKey: ['jobTypeStats'],
    queryFn: async () => {
      const { data } = await api.get('/metrics/jobtypes')
      return data.data  // array of {_id, total, completed, failed, avgExecutionTime}
    },
    refetchInterval: 60000,
  })
}
