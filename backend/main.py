from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import traceback

from PyPDF2 import PdfReader
from docx import Document

from db.base import get_db, Base, engine
from db.models import User, UploadedFiles, InterviewSession, InterviewQuestion, InterviewFeedback
from db.auth import get_current_user
from services.embeddings import get_embeddings
from services.chunks import split_text_into_chunks
from services.vector_store import create_collection
import uuid
from db.schemas import SearchQuery
from services.embeddings import get_query_embedding
from services.vector_store import query_collection
from routers.interview_ws import router as interview_router
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL")

origins = [
    "http://localhost:3000",
]

if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router)

@app.on_event("startup")
async def startup():
    try:
        print("[startup] Importing models and creating tables...")
        Base.metadata.create_all(bind=engine)
        print("[startup] Tables OK.")
    except Exception as e:
        print(f"[startup] ERROR: {e}")
        traceback.print_exc()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {str(exc)}"})

class UserCreate(BaseModel):
    clerk_id: str
    email: str

@app.post("/users")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    print(f"[/users] clerk_id={user.clerk_id}, email={user.email}")
    try:
        existing = db.query(User).filter(User.clerk_id == user.clerk_id).first()
        if existing:
            print("[/users] Already exists.")
            return existing
        db_user = User(clerk_id=user.clerk_id, email=user.email)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"[/users] Saved: {db_user.clerk_id}")
        return db_user
    except Exception as e:
        db.rollback()
        print(f"[/users] DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/me")
def get_me(payload: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    clerk_id = payload["sub"]
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def extract_pdf_text(upload_file: UploadFile) -> str:
    upload_file.file.seek(0)
    try:
        reader = PdfReader(upload_file.file)
        return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parse failed: {e}")


def extract_docx_text(upload_file: UploadFile) -> str:
    upload_file.file.seek(0)
    try:
        document = Document(upload_file.file)
        return "\n\n".join(para.text for para in document.paragraphs).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DOCX parse failed: {e}")


@app.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF or DOCX files are allowed.")

    content_type = file.content_type.lower()
    if content_type == "application/pdf" or file.filename.lower().endswith(".pdf"):
        text = extract_pdf_text(file)
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or file.filename.lower().endswith(".docx"):
        text = extract_docx_text(file)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload PDF or DOCX.")

    if not text:
        raise HTTPException(status_code=400, detail="No readable text was found in the file.")

    chunks = split_text_into_chunks(text)
    embeddings = get_embeddings(chunks)

    collection_name = f"resumes_{payload['sub']}"
    collection = create_collection(collection_name)

    doc_id = str(uuid.uuid4())

    chunk_ids = [f"{doc_id}_{i}" for i in range(len(chunks))]

    collection.add(
    ids=chunk_ids,
    documents=chunks,
    embeddings=embeddings,
    metadatas=[{"source": file.filename, "doc_id": doc_id}] * len(chunks)
)

    uploaded_file = UploadedFiles(
        file_name=file.filename,
        chroma_document_id=doc_id,
        user_clerk_id=payload["sub"],
    )
    db.add(uploaded_file)
    db.commit()
    db.refresh(uploaded_file)

    return {
        "message": "File uploaded and embedded successfully.",
        "file_id": uploaded_file.id,
        "chroma_document_id": doc_id,
        "filename": file.filename,
        "chunks_stored": len(chunks),
    }

@app.get("/files")
def get_uploaded_files(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = db.query(UploadedFiles).filter(
        UploadedFiles.user_clerk_id == payload["sub"]
    ).order_by(UploadedFiles.created_at.desc()).all()

    return [
        {
            "id": f.id,
            "file_name": f.file_name,
            "chroma_document_id": f.chroma_document_id,
            "created_at": f.created_at.isoformat(),
        }
        for f in files
    ]

@app.get("/history")
def get_history(payload: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_clerk_id == payload["sub"])
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    result = []
    for s in sessions:
        result.append({
            "session_id":    s.id,
            "file_name":     s.file.file_name,
            "num_questions": s.num_questions,
            "completed":     s.completed,
            "created_at":    s.created_at.isoformat(),
            "questions": [
                {"index": q.index, "question": q.question, "answer": q.answer}
                for q in sorted(s.questions, key=lambda x: x.index)
            ],
            "feedback": {
                "overall_score": s.feedback.overall_score,
                "summary":       s.feedback.summary,
                "cv_feedback":   s.feedback.cv_feedback,
                "strengths":     json.loads(s.feedback.strengths or "[]"),
                "improvements":  json.loads(s.feedback.improvements or "[]"),
            } if s.feedback else None,
        })
    return result

@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        count = db.query(User).count()
        return {"status": "ok", "user_count": count}
    except Exception as e:
        return {"status": "error", "detail": str(e)}