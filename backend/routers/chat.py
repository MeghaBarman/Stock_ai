from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yfinance as yf
from services.dataset_service import get_quote_from_dataset, get_indicators_from_dataset

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    symbol: str = ""
    conversation_history: list = []

def get_market_data(symbol: str) -> dict:
    data = {}
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        if info and ("currentPrice" in info or "regularMarketPrice" in info):
            data["price"]  = info.get("currentPrice") or info.get("regularMarketPrice", 0)
            data["change"] = info.get("regularMarketChangePercent", 0)
            data["pe"]     = info.get("trailingPE", "N/A")
            data["sector"] = info.get("sector", "N/A")
            data["name"]   = info.get("longName", symbol)
            data["source"] = "live"
            return data
    except Exception:
        pass
    q = get_quote_from_dataset(symbol)
    i = get_indicators_from_dataset(symbol)
    if q:
        data["price"]  = q.get("price", 0)
        data["change"] = q.get("changePercent", 0)
        data["source"] = "dataset"
    if i:
        data["rsi"]     = i.get("rsi", 50)
        data["macd"]    = i.get("macd", 0)
        data["sma20"]   = i.get("sma20", 0)
        data["bbUpper"] = i.get("bbUpper", 0)
        data["bbLower"] = i.get("bbLower", 0)
    return data

def build_reply(message: str, symbol: str, market: dict) -> str:
    msg   = message.lower().strip()
    sym   = symbol.upper() if symbol else "this stock"
    price = market.get("price", 0)
    chg   = market.get("change", 0)
    rsi   = market.get("rsi", 50)
    macd  = market.get("macd", 0)
    sma20 = market.get("sma20", 0)
    bbU   = market.get("bbUpper", 0)
    bbL   = market.get("bbLower", 0)
    pe    = market.get("pe", "N/A")
    sect  = market.get("sector", "N/A")

    rsi_signal  = "oversold" if rsi < 35 else "overbought" if rsi > 65 else "neutral"
    macd_signal = "bullish" if macd > 0 else "bearish"
    trend       = "above" if price > sma20 else "below"
    trend_word  = "uptrend" if price > sma20 else "downtrend"
    chg_str     = f"{'▲' if chg >= 0 else '▼'} {abs(chg):.2f}%"

    if any(k in msg for k in ["buy", "should i", "invest", "entry", "purchase"]):
        if rsi < 40 and macd > 0:
            action = "looks like a reasonable entry"
            reason = f"RSI is {rsi:.1f} (oversold) and MACD is positive — momentum may be turning bullish."
        elif rsi > 68:
            action = "appears overbought — wait for a pullback"
            reason = f"RSI at {rsi:.1f} suggests the stock is stretched. Wait for RSI below 60."
        elif price > sma20:
            action = "is in a short-term uptrend"
            reason = f"Price (${price:.2f}) is above SMA20 (${sma20:.2f}), confirming bullish momentum."
        else:
            action = "shows mixed signals — caution advised"
            reason = f"Price is below SMA20 and RSI is {rsi:.1f}. Wait for a confirmed reversal."
        return (f"📊 {sym} Analysis — ${price:.2f} ({chg_str})\n\n"
                f"{sym} {action}.\n\nTechnicals:\n"
                f"• RSI: {rsi:.1f} ({rsi_signal})\n• MACD: {macd:+.4f} ({macd_signal})\n"
                f"• Price vs SMA20: {trend} (${sma20:.2f})\n\nReasoning: {reason}\n\n"
                f"⚠️ Always use a stop-loss at −7% from entry.")

    if any(k in msg for k in ["sell", "exit", "close", "take profit"]):
        if rsi > 70:
            advice = f"RSI at {rsi:.1f} is overbought — good time to take partial profits."
        elif macd < 0 and price < sma20:
            advice = f"MACD negative and price below SMA20 — bearish setup, consider reducing position."
        else:
            advice = f"No strong sell signal. RSI is {rsi:.1f} and price is {trend} SMA20."
        return (f"📉 Sell Check — {sym}\n\n{advice}\n\n"
                f"Key levels:\n• Stop-loss: ${bbL:.2f} (BB Lower)\n• Take-profit: ${bbU:.2f} (BB Upper)\n• Current: ${price:.2f}")

    if any(k in msg for k in ["risk", "risky", "danger", "safe", "volatile"]):
        bb_width = ((bbU - bbL) / sma20 * 100) if sma20 > 0 else 0
        vol_label = "High" if bb_width > 10 else "Medium" if bb_width > 5 else "Low"
        return (f"⚠️ Risk Assessment — {sym}\n\nVolatility: {vol_label} (BB Width: {bb_width:.1f}%)\n"
                f"RSI: {rsi:.1f} — {rsi_signal}\nSector: {sect}\n\n"
                f"Key risks:\n• Support at ${bbL:.2f} — break below triggers stop-loss\n"
                f"• Macro: rate changes affect all equities\n• Earnings events cause volatility spikes\n\n"
                f"Rule: never risk more than 2% of capital on a single trade.")

    if any(k in msg for k in ["trend", "technical", "indicator", "chart", "momentum", "macd", "rsi", "bollinger"]):
        bb_pos = ((price - bbL) / (bbU - bbL) * 100) if (bbU - bbL) > 0 else 50
        return (f"📈 Technical Analysis — {sym} (${price:.2f})\n\n"
                f"Trend: Price is {trend} SMA20 → {trend_word.upper()}\n\n"
                f"Indicators:\n• RSI (14): {rsi:.1f} — {rsi_signal}\n"
                f"• MACD: {macd:+.4f} — {macd_signal}\n• SMA 20: ${sma20:.2f}\n"
                f"• BB Upper: ${bbU:.2f} | BB Lower: ${bbL:.2f}\n"
                f"• Position in BB: {bb_pos:.0f}%\n\n"
                f"{'Watch for bounce near SMA20 as support.' if price > sma20 else 'Close above SMA20 would signal reversal.'}")

    if any(k in msg for k in ["target", "forecast", "prediction", "where will", "price target"]):
        return (f"🎯 Price Targets — {sym} (Current: ${price:.2f})\n\n"
                f"• Bull case: ${price*1.15:.2f} (+15%)\n"
                f"• Base case: ${price*1.07:.2f} (+7%)\n"
                f"• Bear case: ${price*0.90:.2f} (−10%)\n\n"
                f"Key resistance: ${bbU:.2f} | Key support: ${bbL:.2f}\n\n"
                f"These are technical projections — always set a stop-loss.")

    if any(k in msg for k in ["market", "portfolio", "diversif", "allocation", "sector"]):
        return (f"🌐 Portfolio Guidance — {sym} ({sect})\n\n"
                f"• Single stock max: 5–10% of portfolio\n• Sector max: 25–30%\n• Keep 10–20% cash\n\n"
                f"{sym} is {trend} SMA20 — momentum is {trend_word}\n"
                f"RSI {rsi:.1f}: {'caution, may be extended' if rsi>65 else 'room to move higher' if rsi<45 else 'balanced'}")

    return (f"📊 {sym} — ${price:.2f} ({chg_str})\n\n"
            f"Quick snapshot:\n• RSI: {rsi:.1f} ({rsi_signal})\n"
            f"• MACD: {macd:+.4f} ({macd_signal})\n"
            f"• Trend: Price is {trend} SMA20 — {trend_word}\n\n"
            f"Ask me:\n• 'Should I buy {sym}?'\n• 'What are the risks?'\n"
            f"• 'Explain the trend'\n• 'What is the target price?'")

@router.post("/ask")
def chat(req: ChatRequest):
    """100% offline rule-based advisor — no API key needed."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    market = get_market_data(req.symbol) if req.symbol else {}
    reply  = build_reply(req.message, req.symbol, market)
    return {"reply": reply, "model": "offline-advisor-v1", "dataSource": market.get("source", "none")}
