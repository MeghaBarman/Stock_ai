import React from 'react'

const navItems = [
  { id: 'dashboard',  label: 'Dashboard',    icon: '◈' },
  { id: 'prediction', label: 'AI Prediction', icon: '⬡' },
  { id: 'chat',       label: 'AI Advisor',    icon: '◎' },
  { id: 'simulator',  label: 'What-if',       icon: '⬢' },
  { id: 'anomaly',    label: 'Anomalies',     icon: '⚑' },
  { id: 'dataset',    label: 'Dataset',       icon: '⊞' },
]

export default function Sidebar({ active, onNav }) {
  return (
    <aside style={{
      width: 220, minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10,
    }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #22a865 0%, #58a6ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 600,
          }}>S</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>StockAI</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hybrid Intelligence</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8, border: 'none',
            background: active === item.id ? 'var(--bg-hover)' : 'transparent',
            color: active === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 14, fontWeight: active === item.id ? 500 : 400,
            cursor: 'pointer', marginBottom: 2,
            borderLeft: active === item.id ? '2px solid var(--green)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          Live market data
        </div>
      </div>
    </aside>
  )
}
