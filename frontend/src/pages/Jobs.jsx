import { useState } from 'react'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'
import { useJobs } from '../api/hooks'
import { useSocketEvents } from '../hooks/useSocketEvents'
import JobRow from '../components/jobs/JobRow'
import CreateJobModal from '../components/jobs/CreateJobModal'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import clsx from 'clsx'

const STATUS_OPTIONS = ['', 'pending', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled', 'scheduled', 'delayed']
const PRIORITY_OPTIONS = ['', 'critical', 'high', 'medium', 'low']
const JOB_TYPES = ['', 'EmailJob', 'ImageProcessingJob', 'PDFGenerationJob', 'NotificationJob', 'DataSyncJob', 'ReportGenerationJob', 'WebhookJob']

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-white/[0.05] rounded animate-pulse" style={{ width: `${[60, 100, 80, 70, 60, 80, 50, 40][i]}px` }} />
        </td>
      ))}
    </tr>
  )
}

const TABLE_HEADERS = ['ID', 'Type', 'Status', 'Priority', 'Created', 'Worker', 'Exec Time', 'Actions']

export default function Jobs() {
  useSocketEvents()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [filters, setFilters] = useState({ status: '', priority: '', jobType: '', search: '', page: 1, limit: 20 })

  const { data, isLoading, isFetching, refetch } = useJobs({ ...filters, page })

  const jobs = data?.jobs || data?.data || []
  const total = data?.total || 0
  const pages = data?.pages || data?.totalPages || Math.ceil(total / 20)

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total > 0 ? `${total.toLocaleString()} total jobs` : 'Manage job queue'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn-ghost"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} />
            Create Job
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-slate-500 flex-shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by job ID or type…"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="input-field pl-9 py-2"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="input-field w-auto py-2 bg-dark-700"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s} className="bg-dark-800 capitalize">{s.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Priority */}
        <select
          value={filters.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="input-field w-auto py-2 bg-dark-700"
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
            <option key={p} value={p} className="bg-dark-800 capitalize">{p}</option>
          ))}
        </select>

        {/* Job Type */}
        <select
          value={filters.jobType}
          onChange={(e) => handleFilterChange('jobType', e.target.value)}
          className="input-field w-auto py-2 bg-dark-700"
        >
          <option value="">All Types</option>
          {JOB_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t} className="bg-dark-800">{t}</option>
          ))}
        </select>

        {/* Clear */}
        {(filters.status || filters.priority || filters.jobType || filters.search) && (
          <button
            onClick={() => { setFilters({ status: '', priority: '', jobType: '', search: '', page: 1, limit: 20 }); setPage(1) }}
            className="text-xs text-slate-400 hover:text-white transition-colors px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center">
                        <Search size={20} className="text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-medium">No jobs found</p>
                      <p className="text-xs text-slate-600">Try adjusting your filters or create a new job</p>
                      <button onClick={() => setShowCreate(true)} className="btn-primary mt-1">
                        <Plus size={14} /> Create Job
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <JobRow key={job.id || job._id} job={job} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {jobs.length > 0 && (
          <div className="px-4 border-t border-white/[0.04]">
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateJobModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
