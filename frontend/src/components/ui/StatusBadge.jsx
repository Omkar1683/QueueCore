const STATUS_MAP = {
  pending:     'badge-pending',
  processing:  'badge-processing',
  completed:   'badge-completed',
  failed:      'badge-failed',
  dead_letter: 'badge-dead_letter',
  cancelled:   'badge-cancelled',
  scheduled:   'badge-scheduled',
  delayed:     'badge-delayed',
};

const DOTS = {
  pending: 'bg-yellow-400', processing: 'bg-blue-400', completed: 'bg-green-400',
  failed: 'bg-red-400', dead_letter: 'bg-purple-400', cancelled: 'bg-slate-400',
  scheduled: 'bg-cyan-400', delayed: 'bg-orange-400',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_MAP[status] || 'badge-pending';
  const dot = DOTS[status] || 'bg-slate-400';
  return (
    <span className={cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} mr-1.5`} />
      {status?.replace('_', ' ')}
    </span>
  );
}
