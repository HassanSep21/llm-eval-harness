import httpx

from app.backends.base import LLMBackend
from app.core.config import get_settings


class GroqBackend(LLMBackend):
    """LLM backend for the Groq cloud API (OpenAI-compatible endpoint).

    Groq's API is a drop-in for the OpenAI chat completions shape,
    so the request format is identical to what Ollama's /api/chat expects —
    only the URL, auth header, and response path differ.
    """

    _KNOWN_MODELS = [
        "llama-3.1-70b-versatile",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    ]

    def __init__(self):
        settings = get_settings()
        self._api_key = settings.groq_api_key
        self._default_model = settings.groq_judge_model
        self._base_url = "https://api.groq.com/openai/v1"

    @property
    def name(self) -> str:
        return "groq"

    async def generate(self, messages: list[dict], model: str | None = None, **kwargs) -> str:
        model = model or self._default_model
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={"model": model, "messages": messages},
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    async def list_models(self) -> list[str]:
        return self._KNOWN_MODELS
    

    async def health_check(self) -> None:
        """Raises ValueError if the API key is not configured."""
        if not self._api_key:
            raise ValueError("GROQ_API_KEY is not set in environment")
    