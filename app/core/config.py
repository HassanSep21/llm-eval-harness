from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str
    postgres_password: str = "changeme"

    # Ollama (secondary judge)
    ollama_base_url: str = "http://ollama:11434"
    ollama_judge_model: str = "phi3"

    # Groq (primary judge)
    groq_api_key: str
    groq_judge_model: str = "llama-3.1-70b-versatile"

    # Gemini (optional, future backend)
    gemini_api_key: str | None = None

    # Application behavior
    log_level: str = "INFO"
    log_format: str = "human"          # 'human' for dev, 'json' for prod
    regression_threshold: float = 0.1
    judge_disagreement_threshold: float = 0.3

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
