from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "PropAd Zimbabwe API"
    environment: str = Field("development", env="ENVIRONMENT")
    secret_key: str = Field("super-secret-key", env="SECRET_KEY")
    access_token_expire_minutes: int = Field(60 * 24, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    database_url: str = Field(
        "sqlite+aiosqlite:///./propad.db",
        env="DATABASE_URL",
    )
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"],
        env="ALLOWED_ORIGINS",
    )
    policy_blocklist: list[str] = Field(
        default_factory=lambda: [
            "viewing fee",
            "registration fee",
            "10% commission",
            "ten percent commission",
            "agent commission",
            "lease signing fee",
        ],
        env="POLICY_BLOCKLIST",
    )
    policy_flaglist: list[str] = Field(
        default_factory=lambda: [
            "negotiable fee",
            "processing fee",
            "finder's fee",
        ],
        env="POLICY_FLAGLIST",
    )
    reward_pool_amount: float = Field(500.0, env="REWARD_POOL_AMOUNT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
