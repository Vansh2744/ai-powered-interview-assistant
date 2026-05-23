from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from db.base import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    clerk_id       = Column(String, primary_key=True, index=True)
    email          = Column(String, unique=True, nullable=False)
    created_at     = Column(DateTime, default=datetime.utcnow)
    uploaded_files = relationship("UploadedFiles", back_populates="user")
    sessions       = relationship("InterviewSession", back_populates="user")

    created_at = Column(DateTime, default=datetime.utcnow)

class UploadedFiles(Base):
    __tablename__ = "uploaded_files"
    id                 = Column(Integer, primary_key=True, index=True)
    file_name          = Column(String, nullable=False)
    chroma_document_id = Column(String, nullable=False)
    user_clerk_id      = Column(String, ForeignKey("users.clerk_id"), nullable=False)
    created_at         = Column(DateTime, default=datetime.utcnow)
    user               = relationship("User", back_populates="uploaded_files")
    sessions           = relationship("InterviewSession", back_populates="file")

    created_at = Column(DateTime, default=datetime.utcnow)

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id            = Column(Integer, primary_key=True, index=True)
    user_clerk_id = Column(String, ForeignKey("users.clerk_id"), nullable=False)
    file_id       = Column(Integer, ForeignKey("uploaded_files.id"), nullable=False)
    num_questions = Column(Integer, default=5)
    completed     = Column(Integer, default=0) 
    created_at    = Column(DateTime, default=datetime.utcnow)
    user          = relationship("User", back_populates="sessions")
    file          = relationship("UploadedFiles", back_populates="sessions")
    questions     = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan")
    feedback      = relationship("InterviewFeedback", back_populates="session", uselist=False, cascade="all, delete-orphan")

    created_at = Column(DateTime, default=datetime.utcnow)

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    index      = Column(Integer, nullable=False)
    question   = Column(Text, nullable=False)
    answer     = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    session    = relationship("InterviewSession", back_populates="questions")

    created_at = Column(DateTime, default=datetime.utcnow)

class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"
    id            = Column(Integer, primary_key=True, index=True)
    session_id    = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, unique=True)
    overall_score = Column(Integer, nullable=True)
    summary       = Column(Text, nullable=True)
    cv_feedback   = Column(Text, nullable=True)
    strengths     = Column(Text, nullable=True) 
    improvements  = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    session       = relationship("InterviewSession", back_populates="feedback")

    created_at = Column(DateTime, default=datetime.utcnow)