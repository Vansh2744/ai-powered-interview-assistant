from services.embeddings import get_query_embedding
from services.vector_store import query_collection


query_embedding = get_query_embedding("skills experience projects education work history")
results = query_collection(collection_name, query_embedding, doc_id, n_results=10)

cv_chunks = results["documents"][0]
print(f"[WS] Fetched {len(cv_chunks)} chunks for doc_id={doc_id}")
print(f"[WS] CV Content preview: {cv_chunks[0][:200] if cv_chunks else 'EMPTY'}")  # 👈 add this

session["cv_content"] = "\n\n".join(cv_chunks)
print(f"[WS] Full CV content:\n{session['cv_content'][:500]}")  # 👈 and this