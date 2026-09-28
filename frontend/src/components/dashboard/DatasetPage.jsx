import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Cell, Tooltip, LineChart, Line, CartesianGrid
} from 'recharts'

const api = (path) => axios.get(`/api/dataset${path}`).then(r => r.data)

function StatCard({ label, value, sub, color = 'var(--text-primary)' }) {
  return (
    <div className="card-sm" style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SentimentBadge({ sentiment }) {
  const cfg = {
    positive: { color: 'var(--green)', bg: 'var(--green-dim)' },
    negative: { color: 'var(--red)',   bg: 'var(--red-dim)'   },
    neutral:  { color: 'var(--amber)', bg: 'var(--amber-dim)' },
  }[sentiment] || {}
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      color: cfg.color, background: cfg.bg,
    }}>{sentiment}</span>
  )
}

export default function DatasetPage({ symbol }) {
  const [info,      setInfo]      = useState(null)
  const [stats,     setStats]     = useState(null)
  const [sentiment, setSentiment] = useState(null)
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api('/info'),
      api('/training-stats'),
      api(`/sentiment/${symbol}`),
      api(`/history/${symbol}?period=3mo`),
    ]).then(([inf, st, sent, hist]) => {
      setInfo(inf); setStats(st); setSentiment(sent)
      setHistory(hist.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [symbol])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading dataset info…</div>

  const sentimentChartData = sentiment ? [
    { name: 'Bullish', value: Math.round(sentiment.aggregate.bullish * 100), fill: 'var(--green)' },
    { name: 'Bearish', value: Math.round(sentiment.aggregate.bearish * 100), fill: 'var(--red)' },
    { name: 'Neutral', value: Math.round(sentiment.aggregate.neutral * 100), fill: 'var(--amber)' },
  ] : []

  const priceData = history.map(h => ({ date: h.date.slice(5), price: h.close }))

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Top stats */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 14 }}>
          📦 DATASET OVERVIEW
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard label="Total Rows"     value={stats?.total_rows?.toLocaleString()}  sub="Combined training data" color="var(--blue)" />
          <StatCard label="Features"       value={stats?.total_features}                sub="Technical indicators"   color="var(--purple)" />
          <StatCard label="Stocks Covered" value={stats?.symbols}                       sub="US + Indian markets"    color="var(--green)" />
          <StatCard label="Buy Signals"    value={stats?.target_distribution?.buy_signals?.toLocaleString()}  sub="Target = 1" color="var(--green)" />
          <StatCard label="Sell Signals"   value={stats?.target_distribution?.sell_signals?.toLocaleString()} sub="Target = 0" color="var(--red)" />
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          Date range: {stats?.date_range?.start} → {stats?.date_range?.end}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* Stock list */}
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
            📊 AVAILABLE STOCKS IN DATASET
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
            {info?.stocks?.map(s => (
              <div key={s.symbol} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', borderRadius: 6,
                background: s.symbol === symbol ? 'var(--bg-hover)' : 'transparent',
                borderLeft: s.symbol === symbol ? '2px solid var(--green)' : '2px solid transparent',
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.symbol}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{s.sector}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500,
                    color: s.market === 'IN' ? 'var(--amber)' : 'var(--blue)',
                    background: s.market === 'IN' ? 'var(--amber-dim)' : 'var(--blue-dim)',
                  }}>{s.market}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.rows} rows</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features list */}
        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
            ⚙️ ENGINEERED FEATURES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {stats?.feature_columns?.map(f => (
              <span key={f} style={{
                padding: '3px 9px', borderRadius: 5, fontSize: 11,
                fontFamily: 'JetBrains Mono',
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Price chart from dataset */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
          📈 DATASET PRICE HISTORY — {symbol} (3 months)
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={55} tickFormatter={v => `$${v.toFixed(0)}`} />
            <Tooltip
              formatter={(v) => [`$${v.toFixed(2)}`, 'Close']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="price" stroke="var(--green)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sentiment section */}
      {sentiment && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* Sentiment bar chart */}
          <div className="card" style={{ flex: '0 0 260px' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              🗞️ SENTIMENT SCORE — {symbol}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              Based on {sentiment.aggregate.sampleSize} recent news items
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={sentimentChartData} barSize={36}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={v => [`${v}%`]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {sentimentChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{
              marginTop: 10, textAlign: 'center', fontSize: 14, fontWeight: 600,
              color: sentiment.aggregate.overall === 'bullish' ? 'var(--green)' : sentiment.aggregate.overall === 'bearish' ? 'var(--red)' : 'var(--amber)'
            }}>
              Overall: {sentiment.aggregate.overall.toUpperCase()}
            </div>
          </div>

          {/* Recent headlines */}
          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
              📰 RECENT NEWS HEADLINES — {symbol}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {sentiment.items?.map((item, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 7,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <SentimentBadge sentiment={item.sentiment} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                      {String(item.date).slice(0, 10)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.headline}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    {item.source} · Score: {item.score}
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
