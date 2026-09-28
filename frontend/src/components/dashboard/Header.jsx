import React, { useState } from 'react'

const POPULAR = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'RELIANCE.NS', 'TCS.NS']

export default function Header({ symbol, onSymbolChange }) {
  const [input, setInput] = useState(symbol)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) onSymbolChange(input.trim().toUpperCase())
  }

  return (
    <header style={{
      height: 60, background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 5,
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 360 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Search symbol… AAPL, RELIANCE.NS"
          style={{ flex: 1, height: 36 }}
        />
        <button type="submit" style={{
          padding: '0 16px', borderRadius: 8,
          background: 'var(--green)', color: '#fff',
          border: 'none', fontSize: 14, fontWeight: 500,
          height: 36,
        }}>Go</button>
      </form>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {POPULAR.map(s => (
          <button key={s} onClick={() => { setInput(s); onSymbolChange(s); }}
            style={{
              padding: '3px 10px', borderRadius: 6,
              background: symbol === s ? 'var(--green-dim)' : 'transparent',
              border: `1px solid ${symbol === s ? 'rgba(63,185,80,0.4)' : 'var(--border)'}`,
              color: symbol === s ? 'var(--green)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500,
            }}
          >{s}</button>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </header>
  )
}
