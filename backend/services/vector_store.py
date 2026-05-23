import chromadb
import os
from dotenv import load_dotenv
load_dotenv()

client = chromadb.CloudClient(
    tenant=os.getenv("CHROMA_TENANT"),
    database=os.getenv("CHROMA_DATABASE"),
    api_key=os.getenv("CHROMA_API_KEY"),
)

def create_collection(collection_name: str):
    return client.get_or_create_collection(name=collection_name)


def get_all_chunks_for_document(collection_name: str, doc_id: str) -> list[str]:
    """Fetch ALL chunks belonging to a specific document — used for question generation."""
    collection = client.get_collection(name=collection_name)

    results = collection.get(
        where={"doc_id": doc_id},
        include=["documents", "metadatas"]
    )

    chunks = results.get("documents", [])
    print(f"[VectorStore] Found {len(chunks)} chunks for doc_id={doc_id}")
    return chunks


def query_collection(
    collection_name: str,
    query_embedding: list[float],
    doc_id: str = None,
    n_results: int = 5
):
    """Similarity search — used for answering specific questions."""
    collection = client.get_collection(name=collection_name)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
        where={"doc_id": doc_id} if doc_id else None
    )
    return results