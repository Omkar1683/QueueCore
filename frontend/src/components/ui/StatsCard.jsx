import { TrendingUp, TrendingDown } from 'lucide-react';

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500/20',   icon: 'text-blue-400',   glow: 'shadow-blue-500/20',   border: 'border-blue-500/20' },
  green:  { bg: 'bg-green-500/20',  icon: 'text-green-400',  glow: 'shadow-green-500/20',  border: 'border-green-500/20' },
  red:    { bg: 'bg-red-500/20',    icon: 'text-red-400',    glow: 'shadow-red-500/20',    border: 'border-red-500/20' },
  yellow: { bg: 'bg-yellow-500/20', icon: 'text-yellow-400', glow: 'shadow-yellow-500/20', border: 'border-yellow-500/20' },
  purple: { bg: 'bg-purple-500/20', icon: 'text-purple-400', glow: 'shadow-purple-500/20', border: 'border-purple-500/20' },
  cyan:   { bg: 'bg-cyan-500/20',   icon: 'text-cyan-400',   glow: 'shadow-cyan-500/20',   border: 'border-cyan-500/20' },
  orange: { bg: 'bg-orange-500/20', icon: 'text-orange-400', glow: 'shadow-orange-500/20', border: 'border-orange-500/20' },
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', trend, subtitle }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  const isPositiveTrend = trend >= 0;

  return (
    <div className={`glass-card-hover p-6 border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-bold text-white mt-2 tabular-nums">
            {value?.toLocaleString() ?? '—'}
          </p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositiveTrend ? 'text-green-400' : 'text-red-400'}`}>
              {isPositiveTrend ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend)}% vs last hour
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${c.bg} shadow-lg ${c.glow}`}>
          <Icon size={22} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
