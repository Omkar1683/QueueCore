import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs border border-white/10">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-brand-300 font-semibold">{payload[0]?.value} jobs/min</p>
    </div>
  )
}

export default function ThroughputChart({ data = [] }) {
  const chartData = data.length > 0 ? data : Array.from({ length: 20 }, (_, i) => ({
    time: `${i * 3}m`,
    value: 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#4c6ef5" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4c6ef5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: '#525270', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#525270', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(92,124,250,0.3)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#4c6ef5"
          strokeWidth={2}
          fill="url(#throughputGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#748ffc', stroke: '#1a1a27', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
