"""Regras de validação de username/senha compartilhadas entre o cadastro
(schemas/user.py) e a edição de conta (schemas/profile.py) — extraídas pra
cá pra garantir que as duas telas apliquem exatamente a mesma regra, sem
risco de uma ficar mais frouxa que a outra com o tempo."""
import re


def validate_username(v: str) -> str:
    v = v.strip()
    if not (3 <= len(v) <= 50):
        raise ValueError("username deve ter entre 3 e 50 caracteres")
    if not re.match(r"^[a-zA-Z0-9_.]+$", v):
        raise ValueError("username só pode ter letras, números, ponto e underscore")
    return v


def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("senha precisa ter pelo menos 8 caracteres")
    if not re.search(r"[A-Za-z]", v):
        raise ValueError("senha precisa ter pelo menos uma letra")
    if not re.search(r"\d", v):
        raise ValueError("senha precisa ter pelo menos um número")
    return v
