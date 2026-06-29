import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Cpu, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useJob } from '../api/hooks';
import StatusBadge from '../components/ui/StatusBadge';
import Spinner from '../components/ui/Spinner';
import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';

const EVENT_COLORS = {
  JOB_CREATED:'text-blue-400', WORKER_PICKED:'text-brand-400', JOB_COMPLETED:'text-green-400',
  JOB_FAILED:'text-red-400', RETRY_SCHEDULED:'text-yellow-400', MOVED_TO_DLQ:'text-purple-400',
  REPLAY_STARTED:'text-cyan-400', JOB_CANCELLED:'text-slate-400',
};

function fmt(ms) {
  if (!ms) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(2)}s`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { socket } = useSocket();
  const { data: job, isLoading } = useJob(id);

  // Subscribe to job-specific room for live updates
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('subscribe:job', id);
    const refresh = () => qc.invalidateQueries({ queryKey: ['job', id] });
    socket.on('job:status_changed', refresh);
    socket.on('job:completed', refresh);
    socket.on('job:failed', refresh);
    return () => {
      socket.emit('unsubscribe:job', id);
      socket.off('job:status_changed', refresh);
      socket.off('job:completed', refresh);
      socket.off('job:failed', refresh);
    };
  }, [socket, id, qc]);

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;
  if (!job) return <div className="text-center py-24 text-slate-500">Job not found</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/jobs')} className="btn-ghost mt-1 px-3 py-2">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white font-mono">{job._id}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-slate-500 text-sm mt-1">{job.jobType} • Attempt {job.attempts}/{job.maxAttempts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Timeline */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Clock size={14} className="text-brand-400" />Timeline</h3>
            <div className="space-y-3">
              {[
                { label: 'Created',   time: job.createdAt,   icon: <CheckCircle size={14} className="text-blue-400" /> },
                { label: 'Started',   time: job.startedAt,   icon: <RefreshCw size={14} className="text-brand-400" /> },
                { label: 'Completed', time: job.completedAt, icon: job.status === 'failed' || job.status === 'dead_letter' ? <XCircle size={14} className="text-red-400" /> : <CheckCircle size={14} className="text-green-400" /> },
              ].map(({ label, time, icon }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  {icon}
                  <span className="text-slate-400 w-20 shrink-0">{label}</span>
                  <span className="text-slate-300 font-mono text-xs">{fmtDate(time)}</span>
                </div>
              ))}
              {job.executionTime && (
                <div className="flex items-center gap-3 text-sm pt-1 border-t border-white/5 mt-2">
                  <Clock size={14} className="text-yellow-400" />
                  <span className="text-slate-400 w-20 shrink-0">Duration</span>
                  <span className="text-yellow-400 font-semibold">{fmt(job.executionTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payload */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Payload</h3>
            <pre className="text-xs font-mono text-slate-300 bg-dark-800 rounded-xl p-4 overflow-x-auto border border-white/5">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>

          {/* Failure */}
          {job.failureReason && (
            <div className="glass-card p-5 border border-red-500/20">
              <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Failure Reason
              </h3>
              <p className="text-sm text-red-300 font-mono">{job.failureReason}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Cpu size={14} className="text-brand-400" />Execution Info</h3>
            <div className="space-y-3">
              {[
                { label: 'Worker', value: job.workerId ? job.workerId.slice(-12) : '—', mono: true },
                { label: 'Priority', value: job.priorityLabel || '—' },
                { label: 'Attempts', value: `${job.attempts} / ${job.maxAttempts}` },
                { label: 'Exec Time', value: fmt(job.executionTime) },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-center text-sm py-2 border-b border-white/5 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className={`text-slate-300 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Event Logs</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(job.logs || []).length === 0 && <p className="text-xs text-slate-600 py-4 text-center">No logs yet</p>}
              {[...(job.logs || [])].reverse().map((log, i) => (
                <div key={i} className="text-xs border-b border-white/5 pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-medium ${EVENT_COLORS[log.event] || 'text-slate-400'}`}>{log.event}</span>
                    <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-500">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
