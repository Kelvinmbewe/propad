from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import Base, engine, get_db
from .routers import admin, agents, auth, listings, policy, rewards
from .routers import inquiries as inquiries_router

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/api/v1/health")
async def healthcheck(db: AsyncSession = Depends(get_db)):
    await db.execute("SELECT 1")
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(listings.router, prefix="/api/v1")
app.include_router(inquiries_router.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(rewards.router, prefix="/api/v1")
app.include_router(policy.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "Welcome to PropAd Zimbabwe",
        "promise": "Free to browse. Verified listings. Agents rewarded via PropAd.",
    }
