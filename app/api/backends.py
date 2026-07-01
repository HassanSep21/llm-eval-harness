from fastapi import APIRouter, HTTPException

from app.backends.ollama import OllamaBackend

router = APIRouter(prefix="/backends", tags=["backends"])


@router.get("/ollama/models", response_model=list[str])
async def list_ollama_models():
    """List all models currently available on the local Ollama instance."""
    try:
        backend = OllamaBackend()
        return await backend.list_models()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama unavailable: {e}")
    