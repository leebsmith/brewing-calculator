from pydantic import BaseModel

class AuthenticatedUser(BaseModel):
    uid: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None

class PingResponse(BaseModel):
    id: str
    message: str
    timestamp: int
    user_id: str | None = None
