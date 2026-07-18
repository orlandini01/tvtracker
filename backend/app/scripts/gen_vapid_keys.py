"""Gera um par de chaves VAPID novo pra notificação push do navegador.

Rodar uma vez (`python -m app.scripts.gen_vapid_keys`) e colar o resultado
no .env como VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY. Nunca reaproveitar um
par de exemplo/de outro projeto — a chave privada precisa ser exclusiva
deste servidor.

Formato: ambas as chaves em base64url compacto (sem PEM) — a privada é o
"raw" de 32 bytes esperado por py_vapid/pywebpush (Vapid.from_string), a
pública é o ponto não comprimido (0x04 + X + Y) esperado pelo navegador
como applicationServerKey.
"""
import base64

from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    private_value = private_key.private_numbers().private_value
    private_raw = private_value.to_bytes(32, "big")

    public_numbers = public_key.public_numbers()
    x = public_numbers.x.to_bytes(32, "big")
    y = public_numbers.y.to_bytes(32, "big")
    public_raw = b"\x04" + x + y

    print("VAPID_PUBLIC_KEY=" + _b64url(public_raw))
    print("VAPID_PRIVATE_KEY=" + _b64url(private_raw))
    print()
    print("(cole as duas linhas no backend/.env — nunca commitar isso)")


if __name__ == "__main__":
    main()
