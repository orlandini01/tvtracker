"""Upload de avatar customizado.

Guardado no disco local do servidor (fora do banco — só o caminho relativo
fica no banco), atrás de validação estrita de tipo (só imagens permitidas,
verificado pelo content-type declarado, nunca confiando no nome do
arquivo) e tamanho máximo, antes de gravar qualquer coisa em disco. O nome
do arquivo salvo é sempre gerado pelo servidor (user_id + token aleatório),
nunca derivado do nome original enviado pelo usuário — evita path
traversal e colisão de nomes.
"""
import secrets
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.user import User

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"


class AvatarError(Exception):
    """Erro de validação (tipo de arquivo ou tamanho) — não é erro de infra."""


def _ensure_dir() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _remove_previous_files(user_id: uuid.UUID) -> None:
    """Remove qualquer avatar anterior do usuário. Nomes de arquivo incluem
    um sufixo aleatório (não só a extensão), então usamos glob pelo prefixo
    do user_id em vez de tentar adivinhar o nome exato."""
    if not UPLOAD_ROOT.exists():
        return
    for old in UPLOAD_ROOT.glob(f"{user_id}_*.*"):
        old.unlink(missing_ok=True)


async def save_avatar(db: Session, user: User, file: UploadFile) -> User:
    content_type = (file.content_type or "").lower()
    ext = ALLOWED_CONTENT_TYPES.get(content_type)
    if ext is None:
        raise AvatarError("Formato de imagem não suportado. Use JPEG, PNG ou WEBP.")

    contents = await file.read()
    if not contents:
        raise AvatarError("Arquivo vazio.")
    if len(contents) > MAX_SIZE_BYTES:
        raise AvatarError("Imagem muito grande. O tamanho máximo é 5MB.")

    _ensure_dir()
    _remove_previous_files(user.id)

    # Sufixo aleatório (não só timestamp) pra garantir nome único mesmo em
    # trocas rápidas, e como bônus já evita qualquer cache de navegador
    # servindo a imagem antiga (o caminho muda a cada upload).
    filename = f"{user.id}_{secrets.token_hex(6)}.{ext}"
    (UPLOAD_ROOT / filename).write_bytes(contents)

    user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return user


def remove_avatar(db: Session, user: User) -> User:
    _remove_previous_files(user.id)
    user.avatar_url = None
    db.commit()
    db.refresh(user)
    return user
