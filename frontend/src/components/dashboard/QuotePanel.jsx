import React, { useEffect, useState } from 'react'
import { stocksAPI } from '../../utils/api'

function StatBox({ label, value, sub, color }) {
  return (
    <div className="card-sm" style={{ flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function IndicatorBar({ label, value, min, max, good }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const color = good ? 'var(--green)' : 'var(--red)'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 500, color }}>{typeof value === 'number' ? value.toFixed(2) : value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: 4, width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

export default function QuotePanel({ symbol }) {
  const [quote, setQuote] = useState(null)
  const [indicators, setIndicators] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    Promise.all([stocksAPI.getQuote(symbol), stocksAPI.getIndicators(symbol)])
      .then(([q, i]) => { setQuote(q); setIndicators(i) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Loading {symbol}…</div>
  if (!quote) return null

  const isUp = quote.change >= 0
  const changeColor = isUp ? 'var(--green)' : 'var(--red)'

  return (
    <div className="fade-in">
      {/* Quote header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>{quote.sector}</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{quote.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{quote.symbol}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 600, fontFamily: 'JetBrains Mono', letterSpacing: '-0.03em' }}>
              {quote.price > 0 ? `$${quote.price.toLocaleString()}` : 'N/A'}
            </div>
            <div style={{ fontSize: 14, color: changeColor, fontWeight: 500 }}>
              {isUp ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePercent).toFixed(2)}%)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <StatBox label="Market Cap" value={quote.marketCap > 1e9 ? `$${(quote.marketCap / 1e9).toFixed(1)}B` : `$${(quote.marketCap / 1e6).toFixed(0)}M`} />
          <StatBox label="P/E Ratio" value={quote.pe ? quote.pe.toFixed(1) : 'N/A'} />
          <StatBox label="52W High" value={`$${quote.high52?.toLocaleString()}`} color="var(--green)" />
          <StatBox label="52W Low" value={`$${quote.low52?.toLocaleString()}`} color="var(--red)" />
          <StatBox label="Volume" value={quote.volume > 1e6 ? `${(quote.volume / 1e6).toFixed(1)}M` : quote.volume?.toLocaleString()} />
        </div>
      </div>

      {/* Technical indicators */}
      {indicators && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-secondary)' }}>TECHNICAL INDICATORS</div>
          <IndicatorBar label="RSI (14)" value={indicators.rsi} min={0} max={100} good={indicators.rsi < 50} />
          <IndicatorBar label="MACD" value={indicators.macd} min={-5} max={5} good={indicators.macd > 0} />
          <IndicatorBar label="SMA 20" value={indicators.sma20} min={indicators.bbLower} max={indicators.bbUpper} good={indicators.price > indicators.sma20} />
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'BB Upper', val: indicators.bbUpper, color: 'var(--blue)' },
              { label: 'BB Mid', val: indicators.bbMid, color: 'var(--text-secondary)' },
              { label: 'BB Lower', val: indicators.bbLower, color: 'var(--amber)' },
            ].map(b => (
              <div key={b.label} style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.label}</div>
                <div style={{ fontSize: 14, fontFamily: 'JetBrains Mono', color: b.color }}>${b.val?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
