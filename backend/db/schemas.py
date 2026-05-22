from pydantic import BaseModel

class SearchQuery(BaseModel):
    query: str
    file_id: int = None    # the UploadedFiles.id from your DB
    n_results: int = 5