from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from db.base import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    clerk_id   = Column(String, primary_key=True, index=True)
    email      = Column(String, unique=True, nullable=False)
    uploaded_files = relationship("UploadedFiles", back_populates="user")

    created_at = Column(DateTime, default=datetime.utcnow)

class UploadedFiles(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    chroma_document_id = Column(String, nullable=False)
    user_clerk_id = Column(String, ForeignKey("users.clerk_id"), nullable=False)

    user = relationship("User", back_populates="uploaded_files")

    created_at = Column(DateTime, default=datetime.utcnow)