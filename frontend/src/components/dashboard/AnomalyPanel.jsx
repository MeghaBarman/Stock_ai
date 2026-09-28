import React, { useState, useEffect } from 'react'
import { anomalyAPI } from '../../utils/api'

const severityStyle = {
  critical: { color: 'var(--red)',   bg: 'var(--red-dim)',   border: 'rgba(248,81,73,0.3)' },
  warning:  { color: 'var(--amber)', bg: 'var(--amber-dim)', border: 'rgba(210,153,34,0.3)' },
}

export default function AnomalyPanel({ symbol }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset when symbol changes — no stale data from previous stock
  useEffect(() => {
    setResult(null)
    setError('')
  }, [symbol])

  const run = async () => {
    if (!symbol) return
    setLoading(true); setError('')
    try {
      setResult(await anomalyAPI.detect(symbol))
    } catch (e) {
      setError(e.response?.data?.detail || 'Detection failed')
    } finally {
      setLoading(false)
    }
  }

  const healthColor = result?.marketHealth === 'Stable' ? 'var(--green)'
    : result?.marketHealth === 'Elevated Activity' ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
          📉 MARKET ANOMALY DETECTOR — <span style={{ color: 'var(--green)' }}>{symbol}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          Detects unusual price movements, volume spikes, and insider-like activity
          using Z-score analysis on 6 months of data.
        </div>
        <button onClick={run} disabled={loading || !symbol} style={{
          width: '100%', padding: '10px', borderRadius: 8, border: 'none',
          background: loading ? 'var(--border)' : '#f85149',
          color: '#fff', fontSize: 14, fontWeight: 500,
        }}>
          {loading ? `Scanning ${symbol}…` : `Scan ${symbol} for Anomalies`}
        </button>
        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {result && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MARKET HEALTH — {result.symbol}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: healthColor }}>{result.marketHealth}</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Volatility Z</div>
                  <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono', color: result.recentVolatilityZ > 2 ? 'var(--red)' : 'var(--text-primary)' }}>
                    {result.recentVolatilityZ.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Volume Ratio</div>
                  <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono', color: result.recentVolumeRatio > 2 ? 'var(--amber)' : 'var(--text-primary)' }}>
                    {result.recentVolumeRatio.toFixed(2)}x
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Anomalies</div>
                  <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono', color: result.totalAnomaliesFound > 0 ? 'var(--amber)' : 'var(--green)' }}>
                    {result.totalAnomaliesFound}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {result.anomalies.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--green)', padding: 32 }}>
              ✓ No significant anomalies detected for {result.symbol}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.anomalies.map((a, i) => {
                const s = severityStyle[a.severity] || { color: 'var(--text-secondary)', bg: 'var(--bg-hover)', border: 'var(--border)' }
                return (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: 8, background: s.bg, border: `1px solid ${s.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.severity}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{a.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono' }}>${a.price}</span>
                      <span style={{ fontSize: 13, color: a.priceChange >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {a.priceChange >= 0 ? '+' : ''}{a.priceChange}%
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vol {a.volumeRatio.toFixed(1)}x | Z={a.zScore.toFixed(1)}</span>
                    </div>
                    {a.alerts.map((alert, j) => (
                      <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>• {alert}</div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
