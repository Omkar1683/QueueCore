import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useMetricsHistory, useJobTypeStats } from '../api/hooks';
import ThroughputChart from '../components/charts/ThroughputChart';
import WorkerUtilizationChart from '../components/charts/WorkerUtilizationChart';
import StatsCard from '../components/ui/StatsCard';
import Spinner from '../components/ui/Spinner';
import useSocketEvents from '../hooks/useSocketEvents';

function fmt(ms) {
  if (!ms) return '—';
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function pct(n) {
  return n !== undefined && n !== null ? `${Math.round(n)}%` : '—';
}

export default function Metrics() {
  const { data: history = [], isLoading: histLoading } = useMetricsHistory(60);
  const { data: jobTypeStats = [], isLoading: statsLoading } = useJobTypeStats();
  useSocketEvents();

  // Compute summary from most recent snapshot
  const latest = history[history.length - 1] || {};
  const avgExecMs = history.reduce((acc, h) => acc + (h.avgExecutionTimeMs || 0), 0) / (history.length || 1);
  const throughput = history.reduce((acc, h) => acc + (h.jobsCompletedThisMinute || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Metrics</h1>
        <p className="text-sm text-slate-500 mt-0.5">System performance and analytics</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Avg Exec Time"     value={fmt(avgExecMs)}                   icon={Clock}         color="cyan"   subtitle="across all jobs" />
        <StatsCard title="Success Rate"      value={pct(latest.successRatePct)}        icon={CheckCircle}   color="green"  subtitle="last snapshot" />
        <StatsCard title="Failure Rate"      value={pct(latest.failureRatePct)}        icon={AlertCircle}   color="red"    subtitle="last snapshot" />
        <StatsCard title="Total Throughput"  value={throughput}                         icon={TrendingUp}    color="blue"   subtitle="jobs/last hour" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-400" /> Job Throughput (last 60 min)
          </h3>
          {histLoading ? <div className="flex justify-center py-12"><Spinner /></div> : <ThroughputChart data={history} />}
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-brand-400" /> Worker Utilization
          </h3>
          {histLoading ? <div className="flex justify-center py-12"><Spinner /></div> : <WorkerUtilizationChart data={history} />}
        </div>
      </div>

      {/* Job type breakdown table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 size={14} className="text-brand-400" /> Job Type Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          {statsLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Job Type', 'Total', 'Completed', 'Failed', 'Avg Time', 'Success Rate'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobTypeStats.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">No data yet — create some jobs first</td></tr>
                ) : jobTypeStats.map(stat => {
                  const successRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                  return (
                    <tr key={stat._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-white">{stat._id}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 tabular-nums">{stat.total}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-green-400 tabular-nums">{stat.completed}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-red-400 tabular-nums">{stat.failed + (stat.deadLetter || 0)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{fmt(stat.avgExecutionTime)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-600 to-green-500 rounded-full"
                              style={{ width: `${successRate}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 tabular-nums">{successRate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
