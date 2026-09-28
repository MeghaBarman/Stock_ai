import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const stocksAPI = {
  getQuote: (symbol) => api.get(`/stocks/quote/${symbol}`).then(r => r.data),
  getHistory: (symbol, period = '3mo') => api.get(`/stocks/history/${symbol}?period=${period}`).then(r => r.data),
  getIndicators: (symbol) => api.get(`/stocks/indicators/${symbol}`).then(r => r.data),
  getWatchlist: () => api.get('/stocks/watchlist').then(r => r.data),
}

export const predictionAPI = {
  predict: (payload) => api.post('/prediction/predict', payload).then(r => r.data),
}

export const chatAPI = {
  ask: (message, symbol, history) =>
    api.post('/chat/ask', { message, symbol, conversation_history: history }).then(r => r.data),
}

export const simulatorAPI = {
  simulate: (payload) => api.post('/simulator/simulate', payload).then(r => r.data),
}

export const anomalyAPI = {
  detect: (symbol) => api.get(`/anomaly/detect/${symbol}`).then(r => r.data),
}
