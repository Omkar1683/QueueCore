import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, XCircle, Trash2, Clock } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { useCancelJob, useDeleteJob } from '../../api/hooks';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const PRIORITY_BADGES = {
  0: <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">Critical</span>,
  1: <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30">High</span>,
  2: <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">Medium</span>,
  3: <span className="px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-400 border border-slate-500/30">Low</span>,
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function JobRow({ job, onRefresh }) {
  const { isAdmin } = useAuth();
  const cancelJob = useCancelJob();
  const deleteJob = useDeleteJob();
  const [confirming, setConfirming] = useState(null);

  const handleCancel = async () => {
    try {
      await cancelJob.mutateAsync(job._id);
      toast.success('Job cancelled');
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteJob.mutateAsync(job._id);
      toast.success('Job deleted');
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    } finally {
      setConfirming(null);
    }
  };

  const canCancel = ['pending', 'scheduled', 'delayed'].includes(job.status);

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <Link to={`/jobs/${job._id}`} className="font-mono text-xs text-brand-400 hover:text-brand-300 transition-colors">
          {job._id?.slice(-8)}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-300">{job.jobType}</span>
      </td>
      <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
      <td className="px-4 py-3">{PRIORITY_BADGES[job.priority] ?? PRIORITY_BADGES[2]}</td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Clock size={11} /> {timeAgo(job.createdAt)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-500">
          {job.workerId ? job.workerId.slice(-8) : '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-400">
          {job.executionTime ? `${(job.executionTime / 1000).toFixed(2)}s` : '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Link to={`/jobs/${job._id}`}
            className="p-1.5 rounded-lg hover:bg-brand-600/20 text-slate-400 hover:text-brand-400 transition-colors" title="View details">
            <Eye size={14} />
          </Link>
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelJob.isPending}
              className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400 transition-colors" title="Cancel">
              <XCircle size={14} />
            </button>
          )}
          {isAdmin && (
            confirming === 'delete' ? (
              <span className="flex items-center gap-1">
                <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 font-medium">Yes</button>
                <span className="text-slate-600">/</span>
                <button onClick={() => setConfirming(null)} className="text-xs text-slate-400">No</button>
              </span>
            ) : (
              <button onClick={() => setConfirming('delete')}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  );
}
