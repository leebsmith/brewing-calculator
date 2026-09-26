from pydantic import BaseModel

class PingResponse(BaseModel):
    id: str
    message: str
    timestamp: int
