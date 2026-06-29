import { Cpu, Wifi, WifiOff } from 'lucide-react';
import { useWorkers } from '../api/hooks';
import WorkerCard from '../components/workers/WorkerCard';
import Spinner from '../components/ui/Spinner';
import useSocketEvents from '../hooks/useSocketEvents';

export default function Workers() {
  const { data: workers = [], isLoading } = useWorkers();
  useSocketEvents();

  const online = workers.filter(w => ['online','idle','busy'].includes(w.status));
  const offline = workers.filter(w => w.status === 'offline');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Active processing nodes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 glass-card">
            <Wifi size={14} className="text-green-400" />
            <span className="text-sm text-green-400 font-medium">{online.length} online</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass-card">
            <WifiOff size={14} className="text-slate-500" />
            <span className="text-sm text-slate-500">{offline.length} offline</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner size={36} /></div>
      ) : workers.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Cpu size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">No workers registered yet.</p>
          <p className="text-slate-600 text-sm mt-1">Start the backend to see workers appear here.</p>
        </div>
      ) : (
        <>
          {online.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online Workers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {online.map(w => <WorkerCard key={w.workerId} worker={w} />)}
              </div>
            </div>
          )}
          {offline.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600" /> Offline Workers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {offline.map(w => <WorkerCard key={w.workerId} worker={w} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
