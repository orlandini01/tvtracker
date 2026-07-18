from pydantic import BaseModel


class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class VapidPublicKeyResponse(BaseModel):
    public_key: str
