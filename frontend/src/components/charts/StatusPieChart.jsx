import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const STATUS_COLORS = {
  pending:     '#eab308',
  processing:  '#3b82f6',
  completed:   '#22c55e',
  failed:      '#ef4444',
  dead_letter: '#a855f7',
  cancelled:   '#64748b',
  scheduled:   '#06b6d4',
  delayed:     '#f97316',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="glass-card px-3 py-2 text-xs border border-white/10">
      <p className="font-semibold" style={{ color: STATUS_COLORS[name] || '#fff' }}>
        {name.replace('_', ' ')}
      </p>
      <p className="text-slate-300">{value.toLocaleString()} jobs</p>
    </div>
  )
}

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
    {payload?.map((entry) => (
      <div key={entry.value} className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
        <span className="text-xs text-slate-400 capitalize">{entry.value.replace('_', ' ')}</span>
      </div>
    ))}
  </div>
)

export default function StatusPieChart({ data = [] }) {
  const chartData = data.length > 0 ? data : [
    { name: 'completed', value: 0 },
    { name: 'pending', value: 0 },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] || '#525270'}
              opacity={0.85}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
