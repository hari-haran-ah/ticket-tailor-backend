from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenPayload(BaseModel):
    sub: str
    type: str
