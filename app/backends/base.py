from abc import ABC, abstractmethod


class LLMBackend(ABC):
    """Common interface for all LLM provider clients.

    Each backend handles its own transport, auth, and API shape —
    the runner and judge only ever interact with this interface.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    async def generate(self, messages: list[dict], model: str, **kwargs) -> str:
        """Send a chat-formatted request and return the assistant reply as a string."""
        ...

    @abstractmethod
    async def list_models(self) -> list[str]:
        """Return the names of all models currently available on this backend."""
        ...
