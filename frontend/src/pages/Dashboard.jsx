import { useState, useEffect } from 'react';
import { Clock, Layers, Activity, CheckCircle, AlertCircle, XCircle, Inbox } from 'lucide-react';
import StatsCard from '../components/ui/StatsCard';
import ThroughputChart from '../components/charts/ThroughputChart';
import StatusPieChart from '../components/charts/StatusPieChart';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { useMetrics, useMetricsHistory } from '../api/hooks';
import { useSocket } from '../context/SocketContext';
import useSocketEvents from '../hooks/useSocketEvents';

function LiveFeed({ events }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Activity size={14} className="text-brand-400 animate-pulse" /> Live Event Feed
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {events.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6">Waiting for events…</p>
        )}
        {events.map((ev, i) => (
          <div key={i} className="flex items-center gap-3 text-xs animate-fade-in py-1 border-b border-white/5 last:border-0">
            <span className="text-slate-600 font-mono shrink-0">
              {new Date(ev.ts).toLocaleTimeString()}
            </span>
            <span className="text-slate-400 flex-1">{ev.type.replace(':', ' › ')}</span>
            {ev.status && <StatusBadge status={ev.status} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: metrics, isLoading } = useMetrics();
  const { data: history = [] } = useMetricsHistory(60);
  const { isConnected, socket } = useSocket();
  const [events, setEvents] = useState([]);
  useSocketEvents();

  useEffect(() => {
    if (!socket) return;
    const addEvent = (type) => (data) =>
      setEvents(prev => [{ type, ts: Date.now(), ...data }, ...prev].slice(0, 15));

    const handlers = {
      'job:created': addEvent('job:created'),
      'job:status_changed': addEvent('job:status_changed'),
      'job:completed': addEvent('job:completed'),
      'job:failed': addEvent('job:failed'),
      'worker:status_changed': addEvent('worker:status_changed'),
    };
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
  }, [socket]);

  // metrics.queue contains: pending, processing, completed, failed, dead_letter, deadLetter, total
  const q = metrics?.queue || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time queue overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={isConnected ? 'text-green-400' : 'text-slate-500'}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={32} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard title="Pending"     value={q.pending     ?? 0} icon={Inbox}       color="yellow" />
          <StatsCard title="Processing"  value={q.processing  ?? 0} icon={Activity}    color="blue" />
          <StatsCard title="Completed"   value={q.completed   ?? 0} icon={CheckCircle} color="green" />
          <StatsCard title="Failed"      value={q.failed      ?? 0} icon={AlertCircle} color="red" />
          <StatsCard title="Dead Letter" value={q.deadLetter ?? q.dead_letter ?? 0} icon={XCircle} color="purple" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={14} className="text-brand-400" /> Job Throughput (last 60 min)
          </h3>
          <ThroughputChart data={history} />
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Layers size={14} className="text-brand-400" /> Status Distribution
          </h3>
          <StatusPieChart data={q} />
        </div>
      </div>

      {/* Live Feed */}
      <LiveFeed events={events} />
    </div>
  );
}
