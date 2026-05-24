from pydantic import BaseModel

class SearchQuery(BaseModel):
    query: str
    file_id: int = None
    n_results: int = 5

class UserCreate(BaseModel):
    clerk_id: str
    email: str