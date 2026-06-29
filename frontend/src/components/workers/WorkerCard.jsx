import { formatDistanceToNow } from 'date-fns';
import { Cpu, Briefcase, CheckCircle, AlertCircle, Activity } from 'lucide-react';

const STATUS_STYLES = {
  online:  { dot: 'bg-green-400', ring: 'ring-green-400/30', text: 'text-green-400', label: 'Online' },
  idle:    { dot: 'bg-blue-400',  ring: 'ring-blue-400/30',  text: 'text-blue-400',  label: 'Idle' },
  busy:    { dot: 'bg-yellow-400 animate-pulse', ring: 'ring-yellow-400/30', text: 'text-yellow-400', label: 'Busy' },
  offline: { dot: 'bg-slate-600', ring: 'ring-slate-600/30', text: 'text-slate-500',  label: 'Offline' },
};

function timeAgo(date) {
  if (!date) return 'never';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return '—'; }
}

export default function WorkerCard({ worker }) {
  const s = STATUS_STYLES[worker.status] || STATUS_STYLES.offline;
  const total = (worker.jobsCompleted || 0) + (worker.jobsFailed || 0);
  const successRate = total > 0 ? Math.round((worker.jobsCompleted / total) * 100) : 0;

  return (
    <div className={`glass-card p-5 border transition-all duration-300 ${worker.status === 'offline' ? 'opacity-60 border-white/5' : 'border-white/10 hover:border-white/20'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`relative p-2.5 rounded-xl ${s.dot.includes('yellow') ? 'bg-yellow-500/10' : worker.status === 'offline' ? 'bg-slate-500/10' : 'bg-green-500/10'}`}>
            <Cpu size={18} className={s.text} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{worker.name}</p>
            <p className="text-xs font-mono text-slate-500">{worker.workerId?.slice(-12)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${s.dot} ring-2 ${s.ring}`} />
          <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
        </div>
      </div>

      {/* Current Job */}
      {worker.currentJobType && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Activity size={12} className="text-yellow-400 animate-pulse" />
          <span className="text-xs text-yellow-400 font-medium truncate">{worker.currentJobType}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><CheckCircle size={10} />Completed</p>
          <p className="text-lg font-bold text-green-400">{worker.jobsCompleted ?? 0}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><AlertCircle size={10} />Failed</p>
          <p className="text-lg font-bold text-red-400">{worker.jobsFailed ?? 0}</p>
        </div>
      </div>

      {/* Success rate bar */}
      {total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Success rate</span>
            <span className="text-slate-300 font-medium">{successRate}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-600 to-green-500 rounded-full transition-all duration-700"
              style={{ width: `${successRate}%` }} />
          </div>
        </div>
      )}

      {/* Heartbeat */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs text-slate-600">
        <Briefcase size={10} />
        <span>Heartbeat: {timeAgo(worker.lastHeartbeat)}</span>
      </div>
    </div>
  );
}
