import httpx

from app.backends.base import LLMBackend
from app.core.config import get_settings


class OllamaBackend(LLMBackend):
    """LLM backend for a locally running Ollama instance.

    Uses Ollama's OpenAI-compatible /api/chat endpoint so the message
    format stays identical across backends.
    """

    def __init__(self):
        settings = get_settings()
        self._base_url = settings.ollama_base_url
        self._default_model = settings.ollama_judge_model

    @property
    def name(self) -> str:
        return "ollama"

    async def generate(self, messages: list[dict], model: str | None = None, **kwargs) -> str:
        model = model or self._default_model
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self._base_url}/api/chat",
                json={"model": model, "messages": messages, "stream": False},
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

    async def list_models(self) -> list[str]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self._base_url}/api/tags")
            response.raise_for_status()
            return [m["name"] for m in response.json().get("models", [])]
        