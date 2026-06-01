from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.data.database import init_db
from backend.api.routes import users, stocks, watchlist, portfolio, screener


# ── Lifespan ──────────────────────────────────────────────────
# Runs once when the server starts — initialises the database
# Creates all tables if they don't exist yet
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Vestr] Starting up...")
    init_db()
    print("[Vestr] Database initialised.")
    yield
    print("[Vestr] Shutting down.")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title       = "Vestr API",
    description = "Quantitative investment intelligence platform",
    version     = "1.0.0",
    lifespan    = lifespan,
)


# ── CORS ──────────────────────────────────────────────────────
# CORS (Cross Origin Resource Sharing) controls which domains
# can talk to our API.
#
# In development: allow localhost:3000 (React dev server)
# In production:  lock this down to your actual domain only
#
# NEVER set allow_origins=["*"] in production —
# that allows ANY website to call your API
app.add_middleware(
    CORSMiddleware,
    allow_origins     = [
        "http://localhost:3000",   # React dev server
        "http://localhost:5173",   # Vite dev server (alternative)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Routes ────────────────────────────────────────────────────
# Register all routers — each one brings its prefix with it:
#   users.router     → /api/auth/...
#   stocks.router    → /api/stocks/...
#   watchlist.router → /api/watchlist/...
#   portfolio.router → /api/portfolio/...
#   screener.router  → /api/screener/...

app.include_router(users.router)
app.include_router(stocks.router)
app.include_router(watchlist.router)
app.include_router(portfolio.router)
app.include_router(screener.router)


# ── Health check ──────────────────────────────────────────────
@app.get("/")
def root():
    """
    Basic health check — confirms the server is running.
    Frontend can ping this on startup to verify API is alive.
    """
    return {
        "status"  : "ok",
        "message" : "Vestr API is running.",
        "version" : "1.0.0",
    }


# ── Entry point ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.api.main:app",
        host     = "127.0.0.1",
        port     = 8000,
        reload   = True,   # auto-restarts when you save a file
    )