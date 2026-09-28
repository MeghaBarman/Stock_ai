import React, { useState } from 'react'
import './styles/globals.css'
import Sidebar from './components/dashboard/Sidebar'
import Header from './components/dashboard/Header'
import QuotePanel from './components/dashboard/QuotePanel'
import PriceChart from './components/charts/PriceChart'
import PredictionPanel from './components/dashboard/PredictionPanel'
import ChatPanel from './components/chat/ChatPanel'
import SimulatorPanel from './components/simulator/SimulatorPanel'
import AnomalyPanel from './components/dashboard/AnomalyPanel'
import Watchlist from './components/dashboard/Watchlist'
import DatasetPage from './components/dashboard/DatasetPage'

const SIDEBAR_W = 220

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [symbol, setSymbol] = useState('AAPL')

  // When symbol changes, every page receives the new symbol as a prop
  const handleSymbolChange = (sym) => {
    setSymbol(sym.toUpperCase())
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar active={page} onNav={setPage} />

      <div style={{ marginLeft: SIDEBAR_W, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header symbol={symbol} onSymbolChange={handleSymbolChange} />

        <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1400, width: '100%' }}>

          {/* ── DASHBOARD ── */}
          {page === 'dashboard' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PriceChart symbol={symbol} />
                <QuotePanel symbol={symbol} />
              </div>
              <div style={{ width: 240, flexShrink: 0 }}>
                <Watchlist onSelect={handleSymbolChange} activeSymbol={symbol} />
              </div>
            </div>
          )}

          {/* ── AI PREDICTION — symbol prop passed so title + button always show current stock ── */}
          {page === 'prediction' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PredictionPanel symbol={symbol} />
              </div>
              <div style={{ width: 300, flexShrink: 0 }}>
                <PriceChart symbol={symbol} />
              </div>
            </div>
          )}

          {/* ── AI CHAT — resets conversation when symbol changes ── */}
          {page === 'chat' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, maxWidth: 700 }}>
                <ChatPanel symbol={symbol} />
              </div>
              <div style={{ flex: 1 }}>
                <QuotePanel symbol={symbol} />
              </div>
            </div>
          )}

          {/* ── WHAT-IF SIMULATOR — symbol drives all calculations ── */}
          {page === 'simulator' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SimulatorPanel symbol={symbol} />
              </div>
              <div style={{ width: 300, flexShrink: 0 }}>
                <PriceChart symbol={symbol} />
              </div>
            </div>
          )}

          {/* ── ANOMALY DETECTOR ── */}
          {page === 'anomaly' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <AnomalyPanel symbol={symbol} />
              </div>
              <div style={{ width: 300, flexShrink: 0 }}>
                <QuotePanel symbol={symbol} />
              </div>
            </div>
          )}

          {/* ── DATASET EXPLORER ── */}
          {page === 'dataset' && (
            <DatasetPage symbol={symbol} />
          )}

        </main>

        <footer style={{
          borderTop: '1px solid var(--border)', padding: '12px 24px',
          fontSize: 11, color: 'var(--text-muted)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>StockAI — Hybrid Intelligence Platform</span>
          <span>Data via Yahoo Finance · AI via Claude API · Not financial advice</span>
        </footer>
      </div>
    </div>
  )
}
