from langchain_mistralai import MistralAIEmbeddings
from dotenv import load_dotenv
import os
load_dotenv()

embeddings = MistralAIEmbeddings(
    model="mistral-embed",
    api_key=os.getenv("MISTRAL_API_KEY")
)

def get_embeddings(texts: list[str]) -> list[list[float]]:
    return embeddings.embed_documents(texts)

def get_query_embedding(text: str) -> list[float]:
    return embeddings.embed_query(text)  # single vector, not a list of vectors