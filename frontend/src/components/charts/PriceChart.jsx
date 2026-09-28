import React, { useEffect, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { stocksAPI } from '../../utils/api'

const PERIODS = ['1mo', '3mo', '6mo', '1y', '2y']

function CandleBar(props) {
  const { x, y, width, payload } = props
  if (!payload) return null
  const { open, close, high, low } = payload
  const isUp = close >= open
  const color = isUp ? '#3fb950' : '#f85149'
  const bodyTop = Math.min(open, close)
  const bodyHeight = Math.abs(close - open) || 1
  const scaleY = props.background?.height / (props.background?.value || 1)

  return (
    <g>
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + (high - Math.max(open, close)) * 0}
        stroke={color} strokeWidth={1} />
    </g>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const isUp = d.close >= d.open
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{d.date}</div>
      {[
        ['Open', d.open], ['High', d.high], ['Low', d.low], ['Close', d.close]
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>{k}</span>
          <span style={{ fontFamily: 'JetBrains Mono', color: isUp ? 'var(--green)' : 'var(--red)' }}>
            ${v?.toFixed(2)}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>Volume</span>
        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
          {(d.volume / 1e6).toFixed(1)}M
        </span>
      </div>
    </div>
  )
}

export default function PriceChart({ symbol }) {
  const [data, setData] = useState([])
  const [period, setPeriod] = useState('3mo')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    stocksAPI.getHistory(symbol, period)
      .then(r => setData(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [symbol, period])

  // Prepare chart data with OHLC encoded for rendering
  const chartData = data.map(d => ({
    ...d,
    range: [d.low, d.high],
    body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
    color: d.close >= d.open ? '#3fb950' : '#f85149',
  }))

  const prices = data.map(d => d.close)
  const minP = prices.length > 0 ? Math.min(...prices) * 0.995 : 0
  const maxP = prices.length > 0 ? Math.max(...prices) * 1.005 : 1

  // Sample labels for x-axis (every ~15 items)
  const step = Math.max(1, Math.floor(data.length / 8))
  const tickFormatter = (val, i) => {
    if (i % step !== 0) return ''
    return val?.slice(5) || '' // MM-DD
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          PRICE CHART — {symbol}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '3px 10px', borderRadius: 6, border: '1px solid',
              borderColor: period === p ? 'var(--blue)' : 'var(--border)',
              background: period === p ? 'var(--blue-dim)' : 'transparent',
              color: period === p ? 'var(--blue)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: 500,
            }}>{p}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading chart…
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          No data available for {symbol}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={[minP, maxP]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `$${v.toFixed(0)}`}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="close"
              stroke="var(--blue)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: 'var(--blue)' }}
            />
            {/* Volume indicator — use secondary axis and hide it */}
            <YAxis yAxisId="vol" orientation="right" hide={true} />
            <Bar
              yAxisId="vol"
              dataKey="volume"
              fill="var(--text-muted)"
              opacity={0.15}
              barSize={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
