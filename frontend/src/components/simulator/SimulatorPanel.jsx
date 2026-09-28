import React, { useState, useEffect } from 'react'
import { simulatorAPI } from '../../utils/api'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'

export default function SimulatorPanel({ symbol }) {
  const [config, setConfig] = useState({ invested_amount: 10000, days_ago: 30, crash_percent: 0 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset result when symbol changes — no stale AAPL data shown
  useEffect(() => {
    setResult(null)
    setError('')
  }, [symbol])

  const run = async () => {
    if (!symbol) return
    setLoading(true); setError('')
    try {
      const data = await simulatorAPI.simulate({ symbol, ...config })
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const isProfit = result?.profitLoss >= 0

  const mcData = result ? [
    { name: 'Bear', value: result.monteCarlo30Days.bearValue,  price: result.monteCarlo30Days.bearCase },
    { name: 'Base', value: result.monteCarlo30Days.baseValue,  price: result.monteCarlo30Days.baseCase },
    { name: 'Bull', value: result.monteCarlo30Days.bullValue,  price: result.monteCarlo30Days.bullCase },
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 14 }}>
          🔍 WHAT-IF SIMULATOR — <span style={{ color: 'var(--green)' }}>{symbol}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Amount Invested (₹/$)</div>
            <input type="number" value={config.invested_amount}
              onChange={e => setConfig(p => ({ ...p, invested_amount: parseFloat(e.target.value) }))}
              style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Days ago (past investment)</div>
            <input type="number" value={config.days_ago}
              onChange={e => setConfig(p => ({ ...p, days_ago: parseInt(e.target.value) }))}
              style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Market crash % (0 = skip)</div>
            <input type="number" value={config.crash_percent}
              onChange={e => setConfig(p => ({ ...p, crash_percent: parseFloat(e.target.value) }))}
              style={{ width: '100%' }} min={0} max={100} />
          </div>
        </div>
        <button onClick={run} disabled={loading || !symbol} style={{
          width: '100%', padding: '10px', borderRadius: 8, border: 'none',
          background: loading ? 'var(--border)' : 'var(--purple)',
          color: '#fff', fontSize: 14, fontWeight: 500,
        }}>
          {loading ? `Simulating ${symbol}…` : `Run Simulation for ${symbol}`}
        </button>
        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {result && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>📅 PAST INVESTMENT SCENARIO — {result.symbol}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              If you invested <strong style={{ color: 'var(--text-primary)' }}>${result.investedAmount.toLocaleString()}</strong> on{' '}
              <strong style={{ color: 'var(--blue)' }}>{result.pastDate}</strong> at{' '}
              <strong style={{ color: 'var(--text-primary)' }}>${result.pastPrice}</strong>…
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Shares Bought',  value: result.sharesBought.toFixed(4),                 color: 'var(--text-primary)' },
                { label: 'Current Value',  value: `$${result.currentValue.toLocaleString()}`,      color: isProfit ? 'var(--green)' : 'var(--red)' },
                { label: 'P&L',            value: `${isProfit?'+':''}$${result.profitLoss.toFixed(0)}`, color: isProfit ? 'var(--green)' : 'var(--red)' },
                { label: 'ROI',            value: `${isProfit?'+':''}${result.roiPercent.toFixed(1)}%`, color: isProfit ? 'var(--green)' : 'var(--red)' },
              ].map(item => (
                <div key={item.label} className="card-sm" style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'JetBrains Mono', color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {result.crashScenario && (
            <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(248,81,73,0.3)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', marginBottom: 12 }}>
                ⚠️ CRASH SCENARIO — {result.crashScenario.crashPercent}% Drop
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Crash Price',      value: `$${result.crashScenario.crashPrice}` },
                  { label: 'Portfolio Value',  value: `$${result.crashScenario.portfolioValue?.toLocaleString()}` },
                  { label: 'Potential Loss',   value: `$${result.crashScenario.loss?.toFixed(0)}` },
                ].map(item => (
                  <div key={item.label} className="card-sm" style={{ flex: 1, background: 'var(--red-dim)', borderColor: 'rgba(248,81,73,0.2)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'JetBrains Mono', color: 'var(--red)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>🎲 30-DAY MONTE CARLO (500 simulations)</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Probabilistic outcomes based on historical volatility</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={mcData} barSize={40}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Portfolio Value']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {mcData.map((entry, i) => (
                    <Cell key={i} fill={i === 0 ? 'var(--red)' : i === 1 ? 'var(--blue)' : 'var(--green)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
              {mcData.map((d, i) => (
                <div key={d.name} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.name} Case</div>
                  <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: i===0?'var(--red)':i===1?'var(--blue)':'var(--green)' }}>
                    ${d.price.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
