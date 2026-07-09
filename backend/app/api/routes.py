from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Endpoint simples pra confirmar que a API está de pé.
    Usado no teste de UI da Fase 1.0 (frontend chama isso e mostra o status)."""
    return {"status": "ok"}
