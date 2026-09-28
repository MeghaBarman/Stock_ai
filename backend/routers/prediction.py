from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yfinance as yf
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from services.dataset_service import load_features, load_raw
import warnings
warnings.filterwarnings("ignore")

router = APIRouter()


class PredictionRequest(BaseModel):
    symbol: str
    risk_appetite: str = "medium"  # low / medium / high
    capital: float = 10000
    duration_days: int = 30


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Build feature set from OHLCV for XGBoost."""
    df = df.copy()
    close = df["Close"]

    df["sma5"] = close.rolling(5).mean()
    df["sma20"] = close.rolling(20).mean()
    df["rsi"] = _rsi(close, 14)
    df["macd"] = close.ewm(span=12).mean() - close.ewm(span=26).mean()
    df["vol_change"] = df["Volume"].pct_change()
    df["price_change"] = close.pct_change()
    df["high_low_pct"] = (df["High"] - df["Low"]) / close
    df["bb_position"] = (close - close.rolling(20).mean()) / (2 * close.rolling(20).std())
    df["momentum"] = close / close.shift(10) - 1

    # Target: did price go up in next 5 days?
    df["target"] = (close.shift(-5) > close).astype(int)
    df = df.dropna()
    return df


def _rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - 100 / (1 + rs)


FEATURE_COLS = [
    "sma5", "sma20", "rsi", "macd", "vol_change",
    "price_change", "high_low_pct", "bb_position", "momentum"
]


@router.post("/predict")
def predict(req: PredictionRequest):
    """XGBoost prediction — uses local dataset first, yfinance as live supplement."""
    try:
        # ── Try local feature dataset first (fast, always available) ──
        df_feat = load_features(req.symbol)
        if df_feat is not None and len(df_feat) >= 60:
            df = df_feat.copy()
            # Features already computed
            avail = [c for c in FEATURE_COLS if c in df.columns]
            X = df[avail].values
            y = df["target"].values if "target" in df.columns else None
        else:
            # ── Fallback: download from yfinance and compute features ──
            ticker = yf.Ticker(req.symbol.upper())
            df_raw = ticker.history(period="1y")
            if len(df_raw) < 60:
                raise HTTPException(status_code=400, detail="Not enough historical data")
            df = build_features(df_raw)
            avail = [c for c in FEATURE_COLS if c in df.columns]
            X = df[avail].values
            y = df["target"].values if "target" in df.columns else None

        if y is None or len(X) < 20:
            raise HTTPException(status_code=400, detail="Insufficient data to train model")

        # ── Train XGBoost on all but last 10 rows ──
        X_train, y_train = X[:-10], y[:-10]
        X_latest = X[-1].reshape(1, -1)

        model = XGBClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.1,
            use_label_encoder=False, eval_metric="logloss",
            n_jobs=2, tree_method="hist"
        )
        model.fit(X_train, y_train)

        proba     = model.predict_proba(X_latest)[0]
        buy_prob  = float(proba[1])
        sell_prob = float(proba[0])

        if buy_prob >= 0.65:   signal = "BUY"
        elif sell_prob >= 0.65: signal = "SELL"
        else:                   signal = "HOLD"

        risk_mul   = {"low": 0.85, "medium": 1.0, "high": 1.15}[req.risk_appetite]
        confidence = min(round(max(buy_prob, sell_prob) * 100 * risk_mul, 1), 97.0)

        # ── Volatility ──
        close      = df["Close"] if "Close" in df.columns else pd.Series(X[:, 0])
        returns    = close.pct_change().dropna().tail(30)
        volatility = float(returns.std() * np.sqrt(252) * 100)
        risk_level = "Low" if volatility < 20 else "Medium" if volatility < 40 else "High"

        # ── Feature importances ──
        importances = model.feature_importances_
        top_factors = sorted(zip(avail, importances), key=lambda x: x[1], reverse=True)[:4]

        # ── Projection ──
        avg_return      = float(returns.mean() * req.duration_days * 100)
        current_price   = float(close.iloc[-1])
        target_price    = round(current_price * (1 + avg_return / 100), 2)
        projected_value = req.capital * (1 + avg_return / 100)

        return {
            "symbol":          req.symbol.upper(),
            "signal":          signal,
            "confidence":      confidence,
            "buyProbability":  round(buy_prob  * 100, 1),
            "sellProbability": round(sell_prob * 100, 1),
            "currentPrice":    round(current_price, 2),
            "targetPrice":     target_price,
            "volatility":      round(volatility, 1),
            "riskLevel":       risk_level,
            "projectedValue":  round(projected_value, 2),
            "projectedReturn": round(avg_return, 2),
            "dataSource":      "local_dataset" if df_feat is not None else "yfinance",
            "topFactors": [
                {"factor": f, "weight": round(float(w) * 100, 1)}
                for f, w in top_factors
            ],
            "why": _generate_why(signal, top_factors, df, confidence),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _generate_why(signal, top_factors, df, confidence):
    """Generate human-readable explanation of the prediction."""
    rsi = float(df["rsi"].iloc[-1])
    macd = float(df["macd"].iloc[-1])
    sma5 = float(df["sma5"].iloc[-1])
    sma20 = float(df["sma20"].iloc[-1])

    reasons = []
    if rsi < 30:
        reasons.append("RSI is oversold (<30), suggesting a potential bounce")
    elif rsi > 70:
        reasons.append("RSI is overbought (>70), indicating possible reversal")
    else:
        reasons.append(f"RSI at {rsi:.0f} — neutral momentum zone")

    if sma5 > sma20:
        reasons.append("Short-term SMA crossed above long-term SMA (bullish crossover)")
    else:
        reasons.append("Short-term SMA below long-term SMA (bearish crossover)")

    if macd > 0:
        reasons.append("MACD is positive — upward price momentum detected")
    else:
        reasons.append("MACD is negative — downward momentum present")

    top_name = top_factors[0][0].replace("_", " ").upper() if top_factors else "MOMENTUM"
    reasons.append(f"Most influential factor: {top_name} ({top_factors[0][1]*100:.1f}% weight)")

    return reasons
