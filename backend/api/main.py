import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.data.database import init_db
from backend.api.routes import users, stocks, watchlist, portfolio, screener, alerts


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Vestr] Starting up...")
    init_db()
    print("[Vestr] Database initialised.")
    yield
    print("[Vestr] Shutting down.")


app = FastAPI(
    title           = "Vestr API",
    description     = "Quantitative investment intelligence platform",
    version         = "1.0.0",
    lifespan        = lifespan,
    redirect_slashes = False,
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.include_router(users.router)
app.include_router(stocks.router)
app.include_router(watchlist.router)
app.include_router(portfolio.router)
app.include_router(screener.router)
app.include_router(alerts.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Vestr API is running.", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8000, reload=True)