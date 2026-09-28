"""
dataset_service.py
------------------
Loads pre-generated CSV datasets from data/ folders.
Used as a fast, offline fallback when Yahoo Finance is unavailable,
AND as the primary training source for the XGBoost model.
"""

import os, json
import pandas as pd
import numpy as np
from functools import lru_cache

BASE = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_DIR   = os.path.join(BASE, "raw")
PROC_DIR  = os.path.join(BASE, "processed")
SENT_DIR  = os.path.join(BASE, "sentiment")

# ── normalise symbol for filename ───────────────────────────────────────────
def _fname(symbol: str) -> str:
    return symbol.upper().replace(".", "_")


# ── RAW OHLCV ────────────────────────────────────────────────────────────────
@lru_cache(maxsize=32)
def load_raw(symbol: str) -> pd.DataFrame | None:
    path = os.path.join(RAW_DIR, f"{_fname(symbol)}_raw.csv")
    if not os.path.exists(path):
        return None
    df = pd.read_csv(path, parse_dates=["Date"])
    df = df.sort_values("Date").reset_index(drop=True)
    return df


# ── FEATURE-ENGINEERED ───────────────────────────────────────────────────────
@lru_cache(maxsize=32)
def load_features(symbol: str) -> pd.DataFrame | None:
    path = os.path.join(PROC_DIR, f"{_fname(symbol)}_features.csv")
    if not os.path.exists(path):
        return None
    df = pd.read_csv(path, parse_dates=["Date"])
    df = df.sort_values("Date").reset_index(drop=True)
    return df


# ── COMBINED TRAINING ────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def load_combined() -> pd.DataFrame:
    path = os.path.join(PROC_DIR, "combined_training_data.csv")
    return pd.read_csv(path, parse_dates=["Date"])


# ── SENTIMENT ────────────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def load_sentiment_all() -> pd.DataFrame:
    path = os.path.join(SENT_DIR, "news_sentiment.csv")
    return pd.read_csv(path, parse_dates=["date"])


def get_sentiment(symbol: str, last_n: int = 10) -> list[dict]:
    """Return last N sentiment records for a symbol."""
    df = load_sentiment_all()
    df = df[df["symbol"] == symbol.upper()].sort_values("date", ascending=False).head(last_n)
    return df.to_dict(orient="records")


def sentiment_score(symbol: str, last_n: int = 30) -> dict:
    """Aggregate sentiment score for a symbol over the last N items."""
    df = load_sentiment_all()
    df = df[df["symbol"] == symbol.upper()].sort_values("date", ascending=False).head(last_n)
    if df.empty:
        return {"bullish": 0.33, "bearish": 0.33, "neutral": 0.34, "overall": "neutral"}
    counts  = df["sentiment"].value_counts(normalize=True)
    bull    = float(counts.get("positive", 0))
    bear    = float(counts.get("negative", 0))
    neu     = float(counts.get("neutral",  0))
    avg_s   = float(df["score"].mean())
    overall = "bullish" if bull > bear + 0.1 else "bearish" if bear > bull + 0.1 else "neutral"
    return {
        "bullish": round(bull, 3),
        "bearish": round(bear, 3),
        "neutral": round(neu, 3),
        "avgScore": round(avg_s, 3),
        "overall": overall,
        "sampleSize": len(df),
    }


# ── QUOTE (derived from raw data) ────────────────────────────────────────────
def get_quote_from_dataset(symbol: str) -> dict | None:
    df = load_raw(symbol)
    if df is None or df.empty:
        return None
    latest = df.iloc[-1]
    prev   = df.iloc[-2]
    change = float(latest.Close) - float(prev.Close)
    chg_pct= change / float(prev.Close) * 100
    return {
        "symbol":       symbol.upper(),
        "price":        round(float(latest.Close), 2),
        "open":         round(float(latest.Open), 2),
        "high":         round(float(latest.High), 2),
        "low":          round(float(latest.Low), 2),
        "volume":       int(latest.Volume),
        "change":       round(change, 2),
        "changePercent":round(chg_pct, 2),
        "date":         str(latest.Date)[:10],
        "dataSource":   "local_dataset",
    }


# ── HISTORY (for chart) ──────────────────────────────────────────────────────
def get_history_from_dataset(symbol: str, period: str = "3mo") -> list[dict]:
    df = load_raw(symbol)
    if df is None:
        return []
    days = {"1mo": 21, "3mo": 63, "6mo": 126, "1y": 252, "2y": 504}.get(period, 63)
    df = df.tail(days)
    records = []
    for _, row in df.iterrows():
        records.append({
            "date":   str(row.Date)[:10],
            "open":   round(float(row.Open), 2),
            "high":   round(float(row.High), 2),
            "low":    round(float(row.Low), 2),
            "close":  round(float(row.Close), 2),
            "volume": int(row.Volume),
        })
    return records


# ── INDICATORS (from feature file) ───────────────────────────────────────────
def get_indicators_from_dataset(symbol: str) -> dict | None:
    df = load_features(symbol)
    if df is None or df.empty:
        return None
    r = df.iloc[-1]
    return {
        "symbol":   symbol.upper(),
        "price":    round(float(r.Close), 2),
        "sma20":    round(float(r.sma20), 2),
        "sma50":    round(float(r.sma50), 2),
        "rsi":      round(float(r.rsi), 2),
        "macd":     round(float(r.macd), 4),
        "macdSignal":round(float(r.macd_sig), 4),
        "macdHist": round(float(r.macd_hist), 4),
        "bbUpper":  round(float(r.bb_upper), 2),
        "bbLower":  round(float(r.bb_lower), 2),
        "bbMid":    round(float(r.bb_mid), 2),
        "bbPos":    round(float(r.bb_pos), 3),
        "atr":      round(float(r.atr), 2),
        "stochK":   round(float(r.stoch_k), 2),
        "stochD":   round(float(r.stoch_d), 2),
        "volRatio": round(float(r.vol_ratio), 2),
        "dataSource": "local_dataset",
    }


# ── DATASET INFO ─────────────────────────────────────────────────────────────
def get_dataset_info() -> dict:
    path = os.path.join(BASE, "dataset_info.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


# ── LIST ALL AVAILABLE SYMBOLS ───────────────────────────────────────────────
def available_symbols() -> list[str]:
    info = get_dataset_info()
    return [s["symbol"] for s in info.get("stocks", [])]
