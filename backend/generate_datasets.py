"""
generate_datasets.py
--------------------
Run this script once (or whenever you want fresh data) to:
  1. Download 2 years of OHLCV data from Yahoo Finance (if available)
  2. Compute 30+ technical indicators
  3. Build the combined XGBoost training dataset
  4. Generate news sentiment dataset (synthetic labels for offline use)

Usage (from the backend/ folder):
    python generate_datasets.py

Outputs:
    data/raw/          — 16 raw OHLCV CSVs (one per stock)
    data/processed/    — 16 feature-engineered CSVs + combined_training_data.csv
    data/sentiment/    — news_sentiment.csv
    data/dataset_info.json
"""

import yfinance as yf
import pandas as pd
import numpy as np
import json, os, sys
from datetime import datetime, timedelta

# ── CONFIG ────────────────────────────────────────────────────────────────────
US_STOCKS    = ["AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "NVDA", "META", "JPM"]
INDIA_STOCKS = ["RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS",
                "ICICIBANK.NS","WIPRO.NS","HINDUNILVR.NS","BAJFINANCE.NS"]
ALL_STOCKS   = US_STOCKS + INDIA_STOCKS

STOCK_META = {
    "AAPL": {"name":"Apple Inc",            "price":155.0, "mu":0.22,"sigma":0.26,"market":"US","sector":"Technology"},
    "MSFT": {"name":"Microsoft Corp",       "price":320.0, "mu":0.25,"sigma":0.24,"market":"US","sector":"Technology"},
    "TSLA": {"name":"Tesla Inc",            "price":220.0, "mu":0.18,"sigma":0.60,"market":"US","sector":"EV/Auto"},
    "GOOGL":{"name":"Alphabet Inc",         "price":135.0, "mu":0.20,"sigma":0.28,"market":"US","sector":"Technology"},
    "AMZN": {"name":"Amazon.com Inc",       "price":185.0, "mu":0.23,"sigma":0.30,"market":"US","sector":"E-Commerce"},
    "NVDA": {"name":"NVIDIA Corp",          "price":450.0, "mu":0.55,"sigma":0.58,"market":"US","sector":"Semiconductors"},
    "META": {"name":"Meta Platforms",       "price":290.0, "mu":0.28,"sigma":0.38,"market":"US","sector":"Social Media"},
    "JPM":  {"name":"JPMorgan Chase",       "price":165.0, "mu":0.14,"sigma":0.22,"market":"US","sector":"Finance"},
    "RELIANCE.NS":  {"name":"Reliance Industries","price":2450.0,"mu":0.18,"sigma":0.25,"market":"IN","sector":"Conglomerate"},
    "TCS.NS":       {"name":"Tata Consultancy",   "price":3600.0,"mu":0.15,"sigma":0.20,"market":"IN","sector":"IT Services"},
    "INFY.NS":      {"name":"Infosys Ltd",        "price":1480.0,"mu":0.14,"sigma":0.22,"market":"IN","sector":"IT Services"},
    "HDFCBANK.NS":  {"name":"HDFC Bank",          "price":1640.0,"mu":0.16,"sigma":0.22,"market":"IN","sector":"Banking"},
    "ICICIBANK.NS": {"name":"ICICI Bank",         "price":1020.0,"mu":0.18,"sigma":0.24,"market":"IN","sector":"Banking"},
    "WIPRO.NS":     {"name":"Wipro Ltd",          "price":455.0, "mu":0.10,"sigma":0.26,"market":"IN","sector":"IT Services"},
    "HINDUNILVR.NS":{"name":"Hindustan Unilever", "price":2560.0,"mu":0.12,"sigma":0.18,"market":"IN","sector":"FMCG"},
    "BAJFINANCE.NS":{"name":"Bajaj Finance",      "price":7100.0,"mu":0.20,"sigma":0.32,"market":"IN","sector":"NBFC"},
}

RAW_DIR   = os.path.join(os.path.dirname(__file__), "data", "raw")
PROC_DIR  = os.path.join(os.path.dirname(__file__), "data", "processed")
SENT_DIR  = os.path.join(os.path.dirname(__file__), "data", "sentiment")
BASE_DIR  = os.path.join(os.path.dirname(__file__), "data")

for d in [RAW_DIR, PROC_DIR, SENT_DIR]:
    os.makedirs(d, exist_ok=True)

# ── TECHNICAL INDICATORS ──────────────────────────────────────────────────────
def rsi(s, p=14):
    d = s.diff(); g = d.clip(lower=0).rolling(p).mean(); l = (-d.clip(upper=0)).rolling(p).mean()
    return 100 - 100 / (1 + g / l)

def atr(df, p=14):
    tr = pd.concat([(df.High - df.Low),
                    (df.High - df.Close.shift()).abs(),
                    (df.Low  - df.Close.shift()).abs()], axis=1).max(axis=1)
    return tr.rolling(p).mean()

def add_features(df):
    c, h, l, v = df.Close, df.High, df.Low, df.Volume
    df["sma5"]      = c.rolling(5).mean()
    df["sma10"]     = c.rolling(10).mean()
    df["sma20"]     = c.rolling(20).mean()
    df["sma50"]     = c.rolling(50).mean()
    df["ema12"]     = c.ewm(span=12).mean()
    df["ema26"]     = c.ewm(span=26).mean()
    df["rsi"]       = rsi(c, 14)
    df["rsi_6"]     = rsi(c, 6)
    df["macd"]      = df["ema12"] - df["ema26"]
    df["macd_sig"]  = df["macd"].ewm(span=9).mean()
    df["macd_hist"] = df["macd"] - df["macd_sig"]
    df["bb_mid"]    = c.rolling(20).mean()
    df["bb_std"]    = c.rolling(20).std()
    df["bb_upper"]  = df["bb_mid"] + 2 * df["bb_std"]
    df["bb_lower"]  = df["bb_mid"] - 2 * df["bb_std"]
    df["bb_pos"]    = (c - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"] + 1e-9)
    df["bb_width"]  = (df["bb_upper"] - df["bb_lower"]) / (df["bb_mid"] + 1e-9)
    df["atr"]       = atr(df)
    df["vol_sma20"] = v.rolling(20).mean()
    df["vol_ratio"] = v / (df["vol_sma20"] + 1)
    df["obv"]       = (np.sign(c.diff()) * v).cumsum()
    df["daily_ret"] = c.pct_change()
    df["hlpct"]     = (h - l) / (c + 1e-9)
    df["co_pct"]    = (c - df.Open) / (df.Open + 1e-9)
    df["mom10"]     = c / c.shift(10) - 1
    df["mom20"]     = c / c.shift(20) - 1
    df["roc5"]      = c.pct_change(5)
    low14           = l.rolling(14).min()
    high14          = h.rolling(14).max()
    df["stoch_k"]   = 100 * (c - low14) / (high14 - low14 + 1e-9)
    df["stoch_d"]   = df["stoch_k"].rolling(3).mean()
    df["target"]    = (c.shift(-5) > c).astype(int)
    df["target_3d"] = (c.shift(-3) > c).astype(int)
    df["ret_5d"]    = c.shift(-5) / c - 1
    return df.dropna()


# ── GBM FALLBACK (when Yahoo Finance is unavailable) ─────────────────────────
def gbm_ohlcv(start_price, mu, sigma, n=504, seed=0):
    rng = np.random.default_rng(seed)
    dt  = 1 / 252
    lr  = rng.normal((mu - 0.5 * sigma**2) * dt, sigma * np.sqrt(dt), n)
    c   = start_price * np.exp(np.cumsum(lr))
    intra = np.abs(rng.normal(0, sigma * 0.6 * np.sqrt(dt), n))
    h   = c * (1 + intra)
    l   = c * (1 - intra * 0.8)
    o   = np.roll(c, 1) * (1 + rng.normal(0, sigma * 0.3 * np.sqrt(dt), n))
    o[0] = start_price
    base_vol = 10_000_000 if start_price < 5000 else 2_000_000
    vol  = (base_vol * np.exp(rng.normal(0, 0.5, n))).astype(int)
    spikes = rng.choice(n, size=12, replace=False)
    vol[spikes] *= rng.integers(2, 5, size=12)
    end = datetime.today()
    start = end - timedelta(days=int(n * 1.45))
    dates = pd.bdate_range(start=start, end=end)[-n:].strftime("%Y-%m-%d").tolist()
    return pd.DataFrame({"Date": dates, "Open": o.round(2), "High": h.round(2),
                         "Low": l.round(2), "Close": c.round(2), "Volume": vol})


# ── STEP 1: DOWNLOAD or GENERATE raw OHLCV ───────────────────────────────────
print("=" * 62)
print("STEP 1  Raw OHLCV data (2 years per stock)")
print("=" * 62)
summary, failed_live = [], []

for i, sym in enumerate(ALL_STOCKS):
    fname = os.path.join(RAW_DIR, sym.replace(".", "_") + "_raw.csv")
    downloaded = False
    try:
        ticker = yf.Ticker(sym)
        df = ticker.history(period="2y")
        if len(df) >= 100:
            df = df.reset_index()
            df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
            df = df[["Date","Open","High","Low","Close","Volume"]].round(2)
            df.to_csv(fname, index=False)
            print(f"  [LIVE] {sym:20s}  {len(df)} rows  (Yahoo Finance)")
            downloaded = True
    except Exception:
        pass

    if not downloaded:
        # Use Geometric Brownian Motion to generate realistic synthetic data
        cfg = STOCK_META.get(sym, {"price": 100, "mu": 0.15, "sigma": 0.30})
        df  = gbm_ohlcv(cfg["price"], cfg["mu"], cfg["sigma"], n=504, seed=i * 7)
        df.to_csv(fname, index=False)
        failed_live.append(sym)
        print(f"  [SYN]  {sym:20s}  {len(df)} rows  (synthetic GBM)")

    meta = STOCK_META.get(sym, {})
    summary.append({"symbol": sym, "name": meta.get("name", sym),
                    "rows": len(df), "market": meta.get("market","US"),
                    "sector": meta.get("sector","N/A"),
                    "file": sym.replace(".", "_") + "_raw.csv",
                    "source": "yfinance" if sym not in failed_live else "synthetic_gbm"})

if failed_live:
    print(f"\n  ℹ  {len(failed_live)} stocks used synthetic data (Yahoo Finance blocked).")
    print(f"     Re-run this script on your Windows laptop to get real data.")

# ── STEP 2: FEATURE ENGINEERING ──────────────────────────────────────────────
print()
print("=" * 62)
print("STEP 2  Computing 30+ technical indicators")
print("=" * 62)
all_frames = []
for sym in ALL_STOCKS:
    fname = os.path.join(RAW_DIR, sym.replace(".", "_") + "_raw.csv")
    if not os.path.exists(fname):
        continue
    df = pd.read_csv(fname, parse_dates=["Date"]).sort_values("Date")
    df = add_features(df)
    df["symbol"] = sym
    df["market"] = STOCK_META.get(sym, {}).get("market", "US")
    df["sector"] = STOCK_META.get(sym, {}).get("sector", "N/A")
    out = os.path.join(PROC_DIR, sym.replace(".", "_") + "_features.csv")
    df.to_csv(out, index=False)
    all_frames.append(df)
    print(f"  [OK]   {sym:20s}  {len(df)} rows  {len(df.columns)} columns")

combined = pd.concat(all_frames, ignore_index=True)
combined.to_csv(os.path.join(PROC_DIR, "combined_training_data.csv"), index=False)
print(f"\n  [OK]   Combined training dataset: {len(combined):,} rows × {len(combined.columns)} features")

# ── STEP 3: SENTIMENT DATASET ─────────────────────────────────────────────────
print()
print("=" * 62)
print("STEP 3  News sentiment dataset")
print("=" * 62)

TEMPLATES = {
    "positive": [
        "{n} reports record quarterly earnings, beats estimates by 12%",
        "{n} announces major strategic partnership, stock hits 52-week high",
        "{n} raises full-year revenue guidance on strong product demand",
        "{n} posts strongest revenue growth in 5 years, margins expand",
        "{n} announces large share buyback programme",
        "Analysts upgrade {n} to 'Strong Buy', raise price target 20%",
        "{n} wins landmark government contract worth billions",
        "{n} expands into Southeast Asian markets, revenue surges",
        "{n} dividend hike signals robust free cash flow",
        "{n} AI product launch receives overwhelmingly positive reviews",
        "{n} beats Q2 estimates; management raises FY guidance",
        "{n} new product line drives 35% YoY revenue growth",
    ],
    "negative": [
        "{n} misses Q3 earnings estimates, shares fall 8%",
        "{n} issues profit warning citing rising input costs",
        "{n} faces regulatory investigation, shares under pressure",
        "{n} CFO resigns unexpectedly amid accounting review",
        "{n} supply chain issues severely hit quarterly margins",
        "Analysts downgrade {n} citing stretched valuations",
        "{n} announces 5,000 job cuts as growth slows",
        "{n} revenue growth decelerates sharply in key segments",
        "{n} loses major client contract to competitor",
        "{n} faces class action lawsuit over product defects",
        "{n} guidance cut rattles investors; stock drops 6%",
        "{n} debt load raising concerns among credit analysts",
    ],
    "neutral": [
        "{n} Q3 results in line with Street expectations",
        "{n} maintains annual guidance unchanged",
        "{n} appoints new Chief Technology Officer",
        "{n} announces annual general meeting date",
        "{n} completes previously announced share buyback",
        "Analysts initiate coverage on {n} with 'Hold' rating",
        "{n} board approves routine capital expenditure plan",
        "{n} hosts investor day, reiterates long-term targets",
        "{n} stock trades near analyst consensus price target",
        "{n} quarterly volume data matches seasonal patterns",
        "{n} schedules earnings call for next Thursday",
        "{n} board member retires; replacement announced",
    ],
}
SOURCES_US = ["Reuters","Bloomberg","CNBC","WSJ","MarketWatch","Seeking Alpha","Barron's"]
SOURCES_IN = ["Economic Times","Moneycontrol","Mint","Business Standard","NDTV Profit","Livemint","The Hindu BusinessLine"]

rows = []
rng  = np.random.default_rng(123)
end_dt = datetime.today()

for sym in ALL_STOCKS:
    cfg = STOCK_META.get(sym, {})
    name    = cfg.get("name", sym)
    sources = SOURCES_IN if cfg.get("market") == "IN" else SOURCES_US
    for _ in range(80):
        sent     = rng.choice(["positive","negative","neutral"], p=[0.38, 0.32, 0.30])
        headline = rng.choice(TEMPLATES[sent]).format(n=name)
        base_s   = {"positive": 0.72, "negative": 0.70, "neutral": 0.55}[sent]
        score    = float(np.clip(rng.normal(base_s, 0.12), 0.35, 0.99))
        days_off = int(rng.integers(0, 500))
        date     = (end_dt - timedelta(days=days_off)).strftime("%Y-%m-%d")
        rows.append({
            "date":      date,
            "symbol":    sym,
            "name":      name,
            "market":    cfg.get("market", "US"),
            "sector":    cfg.get("sector", "N/A"),
            "headline":  headline,
            "sentiment": sent,
            "score":     round(score, 3),
            "source":    str(rng.choice(sources)),
        })

sent_df = pd.DataFrame(rows).sort_values(["symbol","date"]).reset_index(drop=True)
sent_df.to_csv(os.path.join(SENT_DIR, "news_sentiment.csv"), index=False)
print(f"  [OK]   {len(sent_df)} news items across {len(ALL_STOCKS)} stocks")
print(f"         Saved → data/sentiment/news_sentiment.csv")

# ── STEP 4: METADATA JSON ─────────────────────────────────────────────────────
meta = {
    "generated_at":  datetime.now().isoformat(),
    "total_stocks":  len(ALL_STOCKS),
    "us_stocks":     US_STOCKS,
    "indian_stocks": INDIA_STOCKS,
    "date_range":    {"start": combined["Date"].min().strftime("%Y-%m-%d") if hasattr(combined["Date"].min(), "strftime") else str(combined["Date"].min())[:10],
                      "end":   combined["Date"].max().strftime("%Y-%m-%d") if hasattr(combined["Date"].max(), "strftime") else str(combined["Date"].max())[:10]},
    "stocks": summary,
    "datasets": {
        "raw_ohlcv":         {"path": "data/raw/",    "rows_per_stock": 504,
                              "columns": ["Date","Open","High","Low","Close","Volume"]},
        "processed_features":{"path": "data/processed/", "feature_count": 30,
                              "target": "1 = price higher in 5 days, 0 = lower"},
        "combined_training": {"path": "data/processed/combined_training_data.csv",
                              "total_rows": len(combined), "total_cols": len(combined.columns)},
        "sentiment":         {"path": "data/sentiment/news_sentiment.csv",
                              "total_rows": len(sent_df),
                              "columns": ["date","symbol","headline","sentiment","score","source"]},
    },
}
with open(os.path.join(BASE_DIR, "dataset_info.json"), "w") as f:
    json.dump(meta, f, indent=2)

# ── SUMMARY ───────────────────────────────────────────────────────────────────
print()
print("=" * 62)
print("ALL DATASETS READY")
print("=" * 62)
print(f"  Raw OHLCV CSVs    : {len(ALL_STOCKS)} files in data/raw/")
print(f"  Feature CSVs      : {len(ALL_STOCKS)} files in data/processed/")
print(f"  Combined training : {len(combined):,} rows × {len(combined.columns)} columns")
print(f"  Sentiment CSV     : {len(sent_df):,} rows")
print(f"  Metadata JSON     : data/dataset_info.json")
print()
if failed_live:
    print(f"  NOTE: {len(failed_live)} stocks used synthetic data.")
    print(f"  To get real Yahoo Finance data, run this script on your laptop")
    print(f"  where finance.yahoo.com is accessible.")
print("=" * 62)
