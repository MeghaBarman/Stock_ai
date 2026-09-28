# StockAI --- Hybrid Market Intelligence Platform

StockAI is a full-stack stock market analytics application that combines
**Python data analysis, machine learning, financial indicators, and an
interactive React dashboard**.

It is designed as a learning and portfolio project to demonstrate how
stock-market data can be collected, processed, analyzed, and presented
through a web application.

> **Note:** StockAI is an educational analytics project and is **not
> financial advice**.

------------------------------------------------------------------------

## What StockAI Does

The application provides several tools for exploring and analyzing
stocks:

-   **Stock Dashboard** --- View prices, charts, watchlists, and
    technical indicators.
-   **AI Prediction** --- Uses an XGBoost classifier to generate a BUY,
    SELL, or HOLD signal from technical features.
-   **Prediction Explanation** --- Shows confidence, probabilities,
    important features, and technical reasons behind the signal.
-   **AI Advisor** --- Provides offline, rule-based responses about a
    selected stock. No AI API key is required for this feature.
-   **What-if Simulator** --- Calculates historical investment outcomes,
    crash scenarios, and a simple 30-day Monte Carlo simulation.
-   **Anomaly Detector** --- Detects unusual price movements and volume
    spikes using statistical thresholds.
-   **Dataset Explorer** --- Allows exploration of local stock datasets,
    engineered features, and sentiment data.

------------------------------------------------------------------------

## Simple Project Explanation

A user selects a stock such as **AAPL, MSFT, TSLA, RELIANCE.NS, or
TCS.NS**.

The application then:

1.  Gets stock data from Yahoo Finance or the included local datasets.
2.  Calculates financial features such as **SMA, RSI, MACD, Bollinger
    Bands, momentum, and volume-related indicators**.
3.  Sends the prepared data to the backend.
4.  The XGBoost model analyzes the selected features.
5.  The application displays a **BUY, SELL, or HOLD** signal with
    probabilities and supporting technical factors.
6.  Other modules allow the user to inspect anomalies, simulate
    investment scenarios, and explore the underlying datasets.

------------------------------------------------------------------------

## Main Features

  -----------------------------------------------------------------------
  Module                              Description
  ----------------------------------- -----------------------------------
  Dashboard                           Stock price, historical chart,
                                      technical indicators, and watchlist

  AI Prediction                       XGBoost-based BUY / SELL / HOLD
                                      classification

  Prediction Explanation              Confidence, buy/sell probability,
                                      feature importance, and technical
                                      reasons

  AI Advisor                          Offline rule-based stock analysis

  What-if Simulator                   Historical investment, crash
                                      scenario, and Monte Carlo
                                      simulation

  Anomaly Detector                    Unusual price movement and
                                      volume-spike detection

  Dataset Explorer                    Local stock data, features,
                                      sentiment, and training statistics
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Dataset

The project includes local datasets for **16 stocks**:

### US Stocks

-   AAPL
-   MSFT
-   TSLA
-   GOOGL
-   AMZN
-   NVDA
-   META
-   JPM

### Indian Stocks

-   RELIANCE.NS
-   TCS.NS
-   INFY.NS
-   HDFCBANK.NS
-   ICICIBANK.NS
-   WIPRO.NS
-   HINDUNILVR.NS
-   BAJFINANCE.NS

The included training dataset contains:

-   **7,200 rows**
-   **41 columns**
-   **16 stocks**
-   OHLCV market data
-   Technical features
-   Prediction target columns
-   **1,280 sentiment records**

The included data covers approximately **May 2024 to April 2026**.

------------------------------------------------------------------------

## Machine Learning

The prediction module uses **XGBoost Classifier**.

### Main features used for prediction

-   SMA 5
-   SMA 20
-   RSI
-   MACD
-   Volume change
-   Price change
-   High-low percentage
-   Bollinger Band position
-   Momentum

The model predicts whether the stock price is expected to move upward
over the defined future period and converts the model probability into:

-   **BUY**
-   **SELL**
-   **HOLD**

The application also displays selected feature importance and technical
indicators to make the result easier to understand.

------------------------------------------------------------------------

## Anomaly Detection

The anomaly detector uses statistical methods rather than a separate
deep-learning model.

It checks:

-   Daily return **Z-scores**
-   Volume compared with its **20-day average**

Large price movements or unusual volume activity are flagged as
anomalies.

------------------------------------------------------------------------

## What-if Simulator

The simulator allows a user to enter:

-   Stock symbol
-   Investment amount
-   Number of days in the past
-   Optional market crash percentage

It calculates:

-   Historical investment value
-   Profit/loss
-   ROI
-   Crash scenario
-   30-day Monte Carlo price ranges

------------------------------------------------------------------------

## Technology Stack

### Frontend

-   React 18
-   Vite
-   Recharts
-   Axios
-   Tailwind CSS

### Backend

-   Python
-   FastAPI
-   Uvicorn
-   Pandas
-   NumPy
-   scikit-learn
-   XGBoost

### Data

-   Yahoo Finance through `yfinance`
-   Local CSV datasets

------------------------------------------------------------------------

## Project Structure

``` text
StockAI/
├── backend/
│   ├── data/
│   │   ├── raw/
│   │   ├── processed/
│   │   ├── sentiment/
│   │   └── models/
│   ├── routers/
│   │   ├── stocks.py
│   │   ├── prediction.py
│   │   ├── anomaly.py
│   │   ├── simulator.py
│   │   ├── dataset.py
│   │   └── chat.py
│   ├── services/
│   ├── main.py
│   ├── generate_datasets.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── index.html
│   └── package.json
│
├── bat/
│   ├── start_backend.bat
│   ├── start_frontend.bat
│   └── start_all.bat
│
└── README.md
```

------------------------------------------------------------------------

## How to Run Locally

### Requirements

-   Python 3.10+
-   Node.js 18+
-   npm

### 1. Clone the repository

``` bash
git clone https://github.com/YOUR-USERNAME/stockai.git
cd stockai
```

### 2. Install backend dependencies

``` bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start the backend

From the `backend` folder:

``` bash
python main.py
```

If you prefer Uvicorn:

``` bash
uvicorn main:app --reload --port 8000
```

### 4. Install frontend dependencies

Open a new terminal:

``` bash
cd frontend
npm install
npm run dev
```

Then open:

``` text
http://localhost:5173
```

### Windows shortcut

The repository also contains startup scripts inside the `bat/` folder:

``` text
bat/start_backend.bat
bat/start_frontend.bat
bat/start_all.bat
```

------------------------------------------------------------------------

## Refreshing the Dataset

The project includes a dataset generation script.

From the `backend` folder:

``` bash
python generate_datasets.py
```

This uses Yahoo Finance data to generate/update the local stock
datasets.

------------------------------------------------------------------------

## Important Notes

-   Yahoo Finance data availability can change.
-   Some features can use the included local datasets as a fallback.
-   The prediction model is intended for demonstration and learning.
-   Predictions are not guaranteed to be accurate.
-   The application should not be used as a substitute for professional
    financial advice.
-   Do not upload private API keys or `.env` files to GitHub.

------------------------------------------------------------------------

## Future Improvements

-   Add proper time-series train/test evaluation.
-   Add model performance metrics such as precision, recall, F1-score,
    and ROC-AUC.
-   Add stronger model validation and backtesting.
-   Add more explainability methods such as SHAP.
-   Add portfolio-level analytics.
-   Deploy the frontend and backend online.
-   Add authentication and user-specific watchlists.

------------------------------------------------------------------------

## Author

**Megha Barman**

M.Sc. Data Science\
Silver Oak University, Ahmedabad

This project was developed as an academic and portfolio project to
demonstrate skills in **Python, SQL, data analysis, machine learning,
FastAPI, and React**.
