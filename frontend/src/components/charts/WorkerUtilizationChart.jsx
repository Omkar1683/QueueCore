import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs border border-white/10 space-y-1">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />
          <span className="text-slate-300 capitalize">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.fill }}>{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export default function WorkerUtilizationChart({ data = [] }) {
  const chartData = data.length > 0 ? data : Array.from({ length: 8 }, (_, i) => ({
    name: `W-${i + 1}`,
    busy: 0,
    idle: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={18} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={true} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#525270', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#525270', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#525270', paddingTop: '8px' }}
          formatter={(value) => <span className="capitalize text-slate-400">{value}</span>}
        />
        <Bar dataKey="busy" name="busy" fill="#4c6ef5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="idle" name="idle" fill="#22223a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
