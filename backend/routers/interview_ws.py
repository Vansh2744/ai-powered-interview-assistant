from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from services.interview import generate_questions, text_to_speech, speech_to_text, generate_feedback
from services.vector_store import get_all_chunks_for_document
from db.base import get_db
from db.models import InterviewSession, InterviewQuestion, InterviewFeedback
from db.auth import get_current_user_ws
import traceback
import json

router = APIRouter()

@router.websocket("/interview/ws")
async def interview_websocket(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()

    try:
        payload  = await get_current_user_ws(token)
        clerk_id = payload["sub"]
    except HTTPException as e:
        await websocket.send_json({"type": "error", "message": e.detail})
        await websocket.close(code=1008)
        return

    db = next(get_db())

    try:
        init_msg = await websocket.receive_json()
        doc_id        = init_msg["doc_id"]
        file_id       = int(init_msg["file_id"])
        num_questions = max(1, min(int(init_msg.get("num_questions", 5)), 10))

        session = InterviewSession(
            user_clerk_id=clerk_id,
            file_id=file_id,
            num_questions=num_questions,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        cv_chunks = get_all_chunks_for_document(f"resumes_{clerk_id}", doc_id)
        if not cv_chunks:
            await websocket.send_json({"type": "error", "message": "No CV content found."})
            return
        cv_content = "\n\n".join(cv_chunks)

        questions = generate_questions(cv_content, num_questions=num_questions)
        for i, q in enumerate(questions):
            db.add(InterviewQuestion(session_id=session.id, index=i + 1, question=q))
        db.commit()

        await websocket.send_json({
            "type": "ready",
            "total_questions": len(questions),
        })

        qa_pairs = []
        for i, question in enumerate(questions):

            await websocket.send_json({
                "type": "question",
                "index": i + 1,
                "total": len(questions),
                "text": question,
            })
            await websocket.send_bytes(text_to_speech(question))

            transcription = speech_to_text(await websocket.receive_bytes())

            db_q = db.query(InterviewQuestion).filter(
                InterviewQuestion.session_id == session.id,
                InterviewQuestion.index == i + 1,
            ).first()
            db_q.answer = transcription
            db.commit()

            qa_pairs.append({"question": question, "answer": transcription})

            await websocket.send_json({
                "type": "transcription",
                "index": i + 1,
                "text": transcription,
            })

        await websocket.send_json({"type": "evaluating"})
        feedback = generate_feedback(cv_content, qa_pairs)

        db.add(InterviewFeedback(
            session_id=session.id,
            overall_score=feedback.get("overall_score"),
            summary=feedback.get("summary"),
            cv_feedback=feedback.get("cv_feedback"),
            strengths=json.dumps(feedback.get("strengths", [])),
            improvements=json.dumps(feedback.get("improvements", [])),
        ))
        session.completed = 1
        db.commit()

        await websocket.send_json({
            "type": "complete",
            "summary": qa_pairs,
            "feedback": feedback,
        })

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {clerk_id}")
    except Exception as e:
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        db.close()
        if websocket.client_state.value != 3:
            try:
                await websocket.close()
            except Exception:
                pass