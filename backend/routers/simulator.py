from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yfinance as yf
import numpy as np
from datetime import datetime, timedelta

router = APIRouter()


class WhatIfRequest(BaseModel):
    symbol: str
    invested_amount: float
    days_ago: int = 30        # "what if I invested N days ago"
    crash_percent: float = 0  # "what if market crashes X%"


@router.post("/simulate")
def simulate(req: WhatIfRequest):
    """What-if investment simulator."""
    try:
        ticker = yf.Ticker(req.symbol.upper())
        df = ticker.history(period="2y")
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {req.symbol}")

        df = df.reset_index()
        current_price = float(df["Close"].iloc[-1])

        # Past investment scenario
        idx = max(0, len(df) - req.days_ago)
        past_price = float(df["Close"].iloc[idx])
        past_date = df["Date"].iloc[idx]
        if hasattr(past_date, "strftime"):
            past_date_str = past_date.strftime("%Y-%m-%d")
        else:
            past_date_str = str(past_date)[:10]

        shares_bought = req.invested_amount / past_price
        current_value = shares_bought * current_price
        profit_loss = current_value - req.invested_amount
        roi_pct = (profit_loss / req.invested_amount) * 100

        # Crash scenario
        crash_price = current_price * (1 - req.crash_percent / 100) if req.crash_percent else None
        crash_value = shares_bought * crash_price if crash_price else None
        crash_loss = (crash_value - req.invested_amount) if crash_value else None

        # Monte Carlo 30-day projection (500 simulations, cheap CPU)
        returns = df["Close"].pct_change().dropna().tail(252)
        mu = float(returns.mean())
        sigma = float(returns.std())
        simulations = []
        for _ in range(500):
            price = current_price
            for _ in range(30):
                price *= np.exp(np.random.normal(mu, sigma))
            simulations.append(price)

        mc_low = float(np.percentile(simulations, 10))
        mc_mid = float(np.percentile(simulations, 50))
        mc_high = float(np.percentile(simulations, 90))

        return {
            "symbol": req.symbol.upper(),
            "investedAmount": req.invested_amount,
            "pastDate": past_date_str,
            "pastPrice": round(past_price, 2),
            "currentPrice": round(current_price, 2),
            "sharesBought": round(shares_bought, 4),
            "currentValue": round(current_value, 2),
            "profitLoss": round(profit_loss, 2),
            "roiPercent": round(roi_pct, 2),
            "crashScenario": {
                "crashPercent": req.crash_percent,
                "crashPrice": round(crash_price, 2) if crash_price else None,
                "portfolioValue": round(crash_value, 2) if crash_value else None,
                "loss": round(crash_loss, 2) if crash_loss else None,
            } if req.crash_percent > 0 else None,
            "monteCarlo30Days": {
                "bearCase": round(mc_low, 2),
                "baseCase": round(mc_mid, 2),
                "bullCase": round(mc_high, 2),
                "bearValue": round((mc_low / current_price) * current_value, 2),
                "baseValue": round((mc_mid / current_price) * current_value, 2),
                "bullValue": round((mc_high / current_price) * current_value, 2),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
