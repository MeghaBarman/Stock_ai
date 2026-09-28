from fastapi import APIRouter, HTTPException
from services.dataset_service import (
    get_quote_from_dataset, get_history_from_dataset,
    get_indicators_from_dataset, get_sentiment,
    sentiment_score, get_dataset_info, available_symbols,
    load_features, load_combined
)

router = APIRouter()


@router.get("/info")
def dataset_info():
    """Metadata about all available datasets."""
    return get_dataset_info()


@router.get("/symbols")
def symbols():
    """List all symbols available in the local dataset."""
    return {"symbols": available_symbols()}


@router.get("/quote/{symbol}")
def dataset_quote(symbol: str):
    """Get latest quote from local dataset (offline-safe)."""
    q = get_quote_from_dataset(symbol)
    if not q:
        raise HTTPException(status_code=404, detail=f"{symbol} not in local dataset")
    return q


@router.get("/history/{symbol}")
def dataset_history(symbol: str, period: str = "3mo"):
    data = get_history_from_dataset(symbol, period)
    if not data:
        raise HTTPException(status_code=404, detail=f"{symbol} not in local dataset")
    return {"symbol": symbol.upper(), "period": period, "data": data, "source": "local_dataset"}


@router.get("/indicators/{symbol}")
def dataset_indicators(symbol: str):
    ind = get_indicators_from_dataset(symbol)
    if not ind:
        raise HTTPException(status_code=404, detail=f"{symbol} not in local dataset")
    return ind


@router.get("/sentiment/{symbol}")
def dataset_sentiment(symbol: str, last_n: int = 15):
    """Return recent news sentiment items for a symbol."""
    items = get_sentiment(symbol, last_n)
    score = sentiment_score(symbol, last_n=30)
    return {
        "symbol":    symbol.upper(),
        "aggregate": score,
        "items":     items,
    }


@router.get("/features/{symbol}")
def dataset_features(symbol: str, last_n: int = 60):
    """Return the last N rows of feature-engineered data for a symbol."""
    df = load_features(symbol)
    if df is None:
        raise HTTPException(status_code=404, detail=f"{symbol} not in local dataset")
    cols = ["Date","Close","rsi","macd","macd_hist","bb_pos","vol_ratio",
            "stoch_k","mom10","mom20","target","ret_5d"]
    available = [c for c in cols if c in df.columns]
    subset = df[available].tail(last_n)
    return {"symbol": symbol.upper(), "rows": len(subset), "data": subset.to_dict(orient="records")}


@router.get("/training-stats")
def training_stats():
    """Stats on the combined training dataset."""
    df = load_combined()
    target_dist = df["target"].value_counts().to_dict() if "target" in df.columns else {}
    return {
        "total_rows":    len(df),
        "total_features": len(df.columns),
        "symbols":       df["symbol"].nunique() if "symbol" in df.columns else 0,
        "date_range":    {
            "start": str(df["Date"].min())[:10] if "Date" in df.columns else "N/A",
            "end":   str(df["Date"].max())[:10] if "Date" in df.columns else "N/A",
        },
        "target_distribution": {
            "buy_signals":  int(target_dist.get(1, 0)),
            "sell_signals": int(target_dist.get(0, 0)),
        },
        "feature_columns": [c for c in df.columns if c not in
                            ["Date","symbol","market","sector","target","target_3d","ret_5d"]],
    }
