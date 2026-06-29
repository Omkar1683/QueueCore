import { useState } from 'react';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { useDeadLetter, useReplayJob, useDeleteDLQ } from '../api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import useSocketEvents from '../hooks/useSocketEvents';

function timeAgo(date) {
  if (!date) return '—';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function DeadLetter() {
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState(null);
  const qc = useQueryClient();
  const replayJob = useReplayJob();
  const deleteDLQ = useDeleteDLQ();
  const { data, isLoading } = useDeadLetter({ page, limit: 20 });
  useSocketEvents();

  const jobs = data?.jobs || [];

  const handleReplay = async (id) => {
    try {
      await replayJob.mutateAsync(id);
      qc.invalidateQueries({ queryKey: ['deadLetter'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job replayed successfully — check Jobs page');
      setConfirming(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Replay failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDLQ.mutateAsync(id);
      qc.invalidateQueries({ queryKey: ['deadLetter'] });
      toast.success('DLQ entry deleted');
      setConfirming(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Dead Letter Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data?.total ?? 0} failed jobs requiring attention</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Original Job ID','Type','Failure Reason','Attempts','Failed At','Replayed','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Spinner size={28} className="mx-auto" /></td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                  🎉 Dead Letter Queue is empty — no failed jobs!
                </td></tr>
              ) : jobs.map(job => (
                <tr key={job._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400">{String(job.originalJobId || job._id).slice(-10)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{job.jobType}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-xs text-red-400 truncate block" title={job.failureReason}>{job.failureReason}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{job.attempts}/{job.maxAttempts}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(job.failedAt)}</td>
                  <td className="px-4 py-3">
                    {job.replayed ? (
                      <span className="text-xs text-green-400 flex items-center gap-1"><RotateCcw size={10} />Yes</span>
                    ) : <span className="text-xs text-slate-600">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {!job.replayed && (
                        confirming === `replay-${job._id}` ? (
                          <span className="flex items-center gap-1 text-xs">
                            <span className="text-slate-500">Replay?</span>
                            <button onClick={() => handleReplay(job._id)} className="text-green-400 hover:text-green-300 font-medium">Yes</button>
                            <span className="text-slate-600">/</span>
                            <button onClick={() => setConfirming(null)} className="text-slate-400">No</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirming(`replay-${job._id}`)}
                            className="p-1.5 rounded-lg hover:bg-green-500/20 text-slate-400 hover:text-green-400 transition-colors" title="Replay">
                            <RotateCcw size={14} />
                          </button>
                        )
                      )}
                      {confirming === `delete-${job._id}` ? (
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-slate-500">Delete?</span>
                          <button onClick={() => handleDelete(job._id)} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
                          <span className="text-slate-600">/</span>
                          <button onClick={() => setConfirming(null)} className="text-slate-400">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirming(`delete-${job._id}`)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <div className="px-4 py-3"><Pagination page={data.page} pages={data.pages} total={data.total} onPageChange={setPage} /></div>}
      </div>
    </div>
  );
}
