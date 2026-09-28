from fastapi import APIRouter, HTTPException
import yfinance as yf
import numpy as np

router = APIRouter()


@router.get("/detect/{symbol}")
def detect_anomalies(symbol: str):
    """Detect unusual price/volume patterns using Z-score and rolling statistics."""
    try:
        ticker = yf.Ticker(symbol.upper())
        df = ticker.history(period="6mo")
        if len(df) < 30:
            raise HTTPException(status_code=400, detail="Not enough data")

        close = df["Close"]
        volume = df["Volume"]

        # Z-score on daily returns
        returns = close.pct_change().dropna()
        z_scores = (returns - returns.mean()) / returns.std()

        # Volume spike: compare to 20-day average
        vol_ratio = volume / volume.rolling(20).mean()

        anomalies = []
        dates = df.index.strftime("%Y-%m-%d").tolist()

        for i in range(len(df)):
            if i < 20:
                continue
            z = float(z_scores.iloc[i - 1]) if i > 0 else 0
            vr = float(vol_ratio.iloc[i])
            price_chg = float(returns.iloc[i - 1]) * 100 if i > 0 else 0

            alerts = []
            severity = "normal"

            if abs(z) > 3:
                alerts.append(f"Extreme price movement: {price_chg:.1f}% (Z={z:.1f})")
                severity = "critical"
            elif abs(z) > 2:
                alerts.append(f"Unusual price move: {price_chg:.1f}%")
                severity = "warning"

            if vr > 3:
                alerts.append(f"Volume spike: {vr:.1f}x normal")
                severity = "critical" if severity != "critical" else severity
            elif vr > 2:
                alerts.append(f"High volume: {vr:.1f}x normal")
                if severity == "normal":
                    severity = "warning"

            if alerts:
                anomalies.append({
                    "date": dates[i],
                    "price": round(float(close.iloc[i]), 2),
                    "priceChange": round(price_chg, 2),
                    "volumeRatio": round(vr, 2),
                    "zScore": round(z, 2),
                    "alerts": alerts,
                    "severity": severity,
                })

        # Recent 10 anomalies, most recent first
        anomalies = sorted(anomalies, key=lambda x: x["date"], reverse=True)[:10]

        # Overall market health
        recent_vol = float(vol_ratio.tail(5).mean())
        recent_z = float(z_scores.tail(5).abs().mean())
        health = "Stable" if recent_z < 1 and recent_vol < 1.5 else \
                 "Elevated Activity" if recent_z < 2 else "High Alert"

        return {
            "symbol": symbol.upper(),
            "anomalies": anomalies,
            "marketHealth": health,
            "recentVolatilityZ": round(recent_z, 2),
            "recentVolumeRatio": round(recent_vol, 2),
            "totalAnomaliesFound": len(anomalies),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
