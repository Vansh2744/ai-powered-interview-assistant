from pydantic import BaseModel

class SearchQuery(BaseModel):
    query: str
    file_id: int = None
    n_results: int = 5