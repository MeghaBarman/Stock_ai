from fastapi import APIRouter, HTTPException, Query
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from services.dataset_service import (
    get_quote_from_dataset, get_history_from_dataset, get_indicators_from_dataset
)

router = APIRouter()

@router.get("/quote/{symbol}")
def get_quote(symbol: str):
    """Get real-time stock quote — falls back to local dataset if API unavailable."""
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        if not info or "currentPrice" not in info and "regularMarketPrice" not in info:
            raise ValueError("Empty response from yfinance")
        return {
            "symbol": symbol.upper(),
            "name": info.get("longName", symbol),
            "price": info.get("currentPrice") or info.get("regularMarketPrice", 0),
            "change": info.get("regularMarketChange", 0),
            "changePercent": info.get("regularMarketChangePercent", 0),
            "volume": info.get("regularMarketVolume", 0),
            "marketCap": info.get("marketCap", 0),
            "pe": info.get("trailingPE", None),
            "high52": info.get("fiftyTwoWeekHigh", 0),
            "low52": info.get("fiftyTwoWeekLow", 0),
            "sector": info.get("sector", "N/A"),
        }
    except Exception:
        # Fallback to local dataset
        local = get_quote_from_dataset(symbol)
        if local:
            return local
        raise HTTPException(status_code=400, detail=f"Could not fetch {symbol} from live API or local dataset")


@router.get("/history/{symbol}")
def get_history(
    symbol: str,
    period: str = Query(default="3mo", enum=["1mo", "3mo", "6mo", "1y", "2y"])
):
    """Get historical OHLCV data for candlestick chart."""
    try:
        ticker = yf.Ticker(symbol.upper())
        df = ticker.history(period=period)
        if df.empty:
            raise ValueError("Empty response from yfinance")

        df = df.reset_index()
        df["Date"] = df["Date"].dt.strftime("%Y-%m-%d")

        records = []
        for _, row in df.iterrows():
            records.append({
                "date": row["Date"],
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        return {"symbol": symbol.upper(), "period": period, "data": records}
    except Exception as e:
        # Fallback to local dataset
        local_data = get_history_from_dataset(symbol, period)
        if local_data:
            return {"symbol": symbol.upper(), "period": period, "data": local_data, "source": "local_dataset"}
        raise HTTPException(status_code=400, detail=f"Could not fetch {symbol} from live API or local dataset")


@router.get("/indicators/{symbol}")
def get_indicators(symbol: str):
    """Calculate technical indicators: RSI, MACD, Bollinger Bands, SMA."""
    try:
        ticker = yf.Ticker(symbol.upper())
        df = ticker.history(period="6mo")
        if df.empty:
            raise ValueError("Empty response from yfinance")

        close = df["Close"]

        # SMA
        sma_20 = close.rolling(20).mean().iloc[-1]
        sma_50 = close.rolling(50).mean().iloc[-1]

        # RSI
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss
        rsi = (100 - 100 / (1 + rs)).iloc[-1]

        # MACD
        ema12 = close.ewm(span=12).mean()
        ema26 = close.ewm(span=26).mean()
        macd_line = (ema12 - ema26).iloc[-1]
        signal_line = (ema12 - ema26).ewm(span=9).mean().iloc[-1]

        # Bollinger Bands
        sma_bb = close.rolling(20).mean()
        std_bb = close.rolling(20).std()
        upper_band = (sma_bb + 2 * std_bb).iloc[-1]
        lower_band = (sma_bb - 2 * std_bb).iloc[-1]

        current_price = float(close.iloc[-1])

        return {
            "symbol": symbol.upper(),
            "price": round(current_price, 2),
            "sma20": round(float(sma_20), 2),
            "sma50": round(float(sma_50), 2),
            "rsi": round(float(rsi), 2),
            "macd": round(float(macd_line), 4),
            "macdSignal": round(float(signal_line), 4),
            "bbUpper": round(float(upper_band), 2),
            "bbLower": round(float(lower_band), 2),
            "bbMid": round(float(sma_bb.iloc[-1]), 2),
        }
    except Exception as e:
        # Fallback to local dataset
        local_indicators = get_indicators_from_dataset(symbol)
        if local_indicators:
            return local_indicators
        raise HTTPException(status_code=400, detail=f"Could not fetch indicators for {symbol} from live API or local dataset")


@router.get("/watchlist")
def get_watchlist_quotes():
    """Bulk quotes for a default watchlist."""
    symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "RELIANCE.NS", "TCS.NS", "INFY.NS"]
    results = []
    for sym in symbols:
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info
            if info and ("currentPrice" in info or "regularMarketPrice" in info):
                results.append({
                    "symbol": sym,
                    "name": info.get("longName", sym),
                    "price": info.get("currentPrice") or info.get("regularMarketPrice", 0),
                    "changePercent": round(info.get("regularMarketChangePercent", 0), 2),
                })
        except Exception:
            # Fallback to dataset for this symbol
            try:
                local_quote = get_quote_from_dataset(sym)
                if local_quote:
                    results.append({
                        "symbol": sym,
                        "name": local_quote.get("symbol", sym),
                        "price": local_quote.get("price", 0),
                        "changePercent": local_quote.get("changePercent", 0),
                    })
            except Exception:
                pass
    return results
