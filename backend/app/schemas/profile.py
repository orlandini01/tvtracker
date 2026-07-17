from pydantic import BaseModel


class ShareStatusResponse(BaseModel):
    enabled: bool
    share_token: str | None
