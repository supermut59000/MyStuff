from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST:     str = "localhost"
    DB_PORT:     int = 3306
    DB_USER:     str = "mystuff"
    DB_PASSWORD: str = "mystuff"
    DB_NAME:     str = "mystuff"

    API_HOST:    str  = "0.0.0.0"
    API_PORT:    int  = 8000
    DEBUG:       bool = False

    API_KEY:      str = "change-me"
    CORS_ORIGINS: str = "http://localhost:3056"

    UPLOAD_DIR:         str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env.local"}


settings = Settings()
