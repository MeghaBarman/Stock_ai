from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import stocks, prediction, chat, simulator, anomaly, dataset

app = FastAPI(title="StockAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(prediction.router, prefix="/api/prediction", tags=["prediction"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["simulator"])
app.include_router(anomaly.router,  prefix="/api/anomaly",  tags=["anomaly"])
app.include_router(dataset.router,  prefix="/api/dataset",  tags=["dataset"])

@app.get("/")
def root():
    return {"status": "StockAI API running"}
