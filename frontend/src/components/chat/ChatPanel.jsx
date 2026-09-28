import React, { useState, useRef, useEffect } from 'react'
import { chatAPI } from '../../utils/api'

const SUGGESTIONS = [
  'Should I buy this stock now?',
  'What are the key risks?',
  'Explain the current trend',
  'What is the target price?',
  'Is it overbought or oversold?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16,
      flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--blue-dim)' : 'var(--green-dim)',
        border: `1px solid ${isUser ? 'rgba(88,166,255,0.3)' : 'rgba(63,185,80,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
        color: isUser ? 'var(--blue)' : 'var(--green)',
      }}>{isUser ? 'U' : 'AI'}</div>
      <div style={{
        maxWidth: '82%', padding: '10px 14px',
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser ? 'var(--blue-dim)' : 'var(--bg-hover)',
        border: `1px solid ${isUser ? 'rgba(88,166,255,0.2)' : 'var(--border)'}`,
        fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
      }}>{msg.content}</div>
    </div>
  )
}

export default function ChatPanel({ symbol }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef(null)

  // Reset chat greeting whenever symbol changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hi! I'm your offline AI advisor for ${symbol}.\n\nI analyse live technical indicators (RSI, MACD, Bollinger Bands, SMA) and give you instant insights — no internet API needed.\n\nAsk me anything about ${symbol} 👇`,
    }])
    setInput('')
  }, [symbol])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await chatAPI.ask(msg, symbol, [])
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Could not reach the backend. Make sure start_backend.bat is running on port 8000.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 600 }}>
      {/* Header */}
      <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
            🗣️ AI FINANCIAL ADVISOR
            <span style={{ color: 'var(--green)', marginLeft: 8, fontSize: 12 }}>— {symbol}</span>
          </div>
        </div>
        <div style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 5, fontWeight: 500,
          background: 'var(--green-dim)', color: 'var(--green)',
          border: '1px solid rgba(63,185,80,0.3)',
        }}>● OFFLINE</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 12 }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-dim)',
              border: '1px solid rgba(63,185,80,0.3)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, color: 'var(--green)' }}>AI</div>
            <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px',
              background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              <span className="pulse-dot" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'var(--green)', marginRight:3 }} />
              <span className="pulse-dot" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'var(--green)', marginRight:3, animationDelay:'0.2s' }} />
              <span className="pulse-dot" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'var(--green)', animationDelay:'0.4s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)} style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 11,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Ask about ${symbol}…`}
          style={{ flex: 1 }} disabled={loading}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          padding: '0 16px', borderRadius: 8, border: 'none',
          background: input.trim() ? 'var(--green)' : 'var(--border)',
          color: '#fff', fontSize: 14, fontWeight: 500, height: 38,
          transition: 'background 0.15s',
        }}>Send</button>
      </div>
    </div>
  )
}
