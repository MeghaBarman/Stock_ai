import React, { useState, useEffect } from 'react'
import { predictionAPI } from '../../utils/api'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

function ConfidenceRing({ value, signal }) {
  const color = signal === 'BUY' ? '#3fb950' : signal === 'SELL' ? '#f85149' : '#d29922'
  const data = [{ value, fill: color }, { value: 100 - value, fill: 'var(--border)' }]
  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <ResponsiveContainer width={120} height={120}>
        <RadialBarChart innerRadius={40} outerRadius={56} data={data} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" cornerRadius={4} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'JetBrains Mono' }}>{value}%</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>confidence</div>
      </div>
    </div>
  )
}

function FactorBar({ factor, weight }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {factor.replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--blue)' }}>{weight.toFixed(1)}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{
          height: 3, width: `${weight}%`, borderRadius: 2,
          background: 'linear-gradient(90deg, var(--blue), var(--purple))',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

export default function PredictionPanel({ symbol }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState({ risk_appetite: 'medium', capital: 10000, duration_days: 30 })

  // Reset result when symbol changes — prevents showing stale AAPL data on other stocks
  useEffect(() => {
    setResult(null)
    setError('')
  }, [symbol])

  const runPrediction = async () => {
    if (!symbol) return
    setLoading(true); setError('')
    try {
      const data = await predictionAPI.predict({ symbol, ...config })
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const signalClass = result
    ? result.signal === 'BUY' ? 'signal-buy' : result.signal === 'SELL' ? 'signal-sell' : 'signal-hold'
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Config */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 14 }}>
          🧬 PERSONALIZED AI ADVISOR — <span style={{ color: 'var(--green)' }}>{symbol}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Risk Appetite</div>
            <select value={config.risk_appetite} onChange={e => setConfig(p => ({ ...p, risk_appetite: e.target.value }))} style={{ width: '100%' }}>
              <option value="low">Low — Conservative</option>
              <option value="medium">Medium — Balanced</option>
              <option value="high">High — Aggressive</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Capital (₹/$)</div>
            <input type="number" value={config.capital}
              onChange={e => setConfig(p => ({ ...p, capital: parseFloat(e.target.value) }))}
              style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Duration (days)</div>
            <input type="number" value={config.duration_days}
              onChange={e => setConfig(p => ({ ...p, duration_days: parseInt(e.target.value) }))}
              style={{ width: '100%' }} />
          </div>
        </div>
        <button onClick={runPrediction} disabled={loading || !symbol} style={{
          width: '100%', padding: '10px', borderRadius: 8, border: 'none',
          background: loading ? 'var(--border)' : 'var(--green)',
          color: '#fff', fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
        }}>
          {loading ? `Running XGBoost on ${symbol}…` : `⚡ Analyze ${symbol}`}
        </button>
        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {/* Result — only shows after clicking Analyze for the current symbol */}
      {result && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <ConfidenceRing value={result.confidence} signal={result.signal} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>AI SIGNAL — {result.symbol}</div>
                <div className={`tag ${signalClass}`} style={{ fontSize: 22, padding: '6px 18px', fontWeight: 700, letterSpacing: '0.1em' }}>
                  {result.signal}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current </span><span style={{ fontSize: 13, fontFamily: 'JetBrains Mono' }}>${result.currentPrice}</span></div>
                  <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target </span><span style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>${result.targetPrice}</span></div>
                  <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Volatility </span><span style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--amber)' }}>{result.volatility}%</span></div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>RISK LEVEL</div>
                <div style={{
                  padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                  ...(result.riskLevel === 'Low'
                    ? { color: 'var(--green)', background: 'var(--green-dim)' }
                    : result.riskLevel === 'Medium'
                    ? { color: 'var(--amber)', background: 'var(--amber-dim)' }
                    : { color: 'var(--red)', background: 'var(--red-dim)' })
                }}>{result.riskLevel}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Buy {result.buyProbability}% / Sell {result.sellProbability}%
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>🧠 WHY THIS PREDICTION?</div>
            {result.why?.map((reason, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < result.why.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: 'var(--blue)', fontSize: 12, marginTop: 1 }}>→</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{reason}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>📊 KEY INFLUENCING FACTORS (SHAP)</div>
            {result.topFactors?.map(f => <FactorBar key={f.factor} factor={f.factor} weight={f.weight} />)}
          </div>

          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>💼 PORTFOLIO PROJECTION ({result.symbol})</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Capital Invested', value: `$${config.capital.toLocaleString()}`, color: 'var(--text-primary)' },
                { label: 'Projected Value', value: `$${result.projectedValue.toLocaleString()}`, color: result.projectedReturn >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Expected Return', value: `${result.projectedReturn >= 0 ? '+' : ''}${result.projectedReturn}%`, color: result.projectedReturn >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Duration', value: `${config.duration_days} days`, color: 'var(--text-secondary)' },
              ].map(item => (
                <div key={item.label} className="card-sm" style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'JetBrains Mono', color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
