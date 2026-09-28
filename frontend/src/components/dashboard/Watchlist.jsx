import React, { useEffect, useState } from 'react'
import { stocksAPI } from '../../utils/api'

export default function Watchlist({ onSelect, activeSymbol }) {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    stocksAPI.getWatchlist()
      .then(setStocks)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
        WATCHLIST
      </div>
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
      ) : (
        stocks.map(s => (
          <div
            key={s.symbol}
            onClick={() => onSelect(s.symbol)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', borderRadius: 6, marginBottom: 2, cursor: 'pointer',
              background: activeSymbol === s.symbol ? 'var(--bg-hover)' : 'transparent',
              borderLeft: activeSymbol === s.symbol ? '2px solid var(--green)' : '2px solid transparent',
              transition: 'all 0.12s',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.symbol.replace('.NS', '')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                {s.price > 0 ? `$${s.price.toLocaleString()}` : '—'}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 500,
                color: s.changePercent >= 0 ? 'var(--green)' : 'var(--red)'
              }}>
                {s.changePercent >= 0 ? '▲' : '▼'} {Math.abs(s.changePercent).toFixed(2)}%
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
