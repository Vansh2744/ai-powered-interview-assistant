from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from services.interview import generate_questions, text_to_speech, speech_to_text
from services.vector_store import query_collection
from services.embeddings import get_query_embedding
from db.auth import get_current_user_ws
import json
import traceback

router = APIRouter()

@router.websocket("/interview/ws")
async def interview_websocket(
    websocket: WebSocket,
    token: str = Query(...),         # pass JWT as query param since WS has no headers
):
    await websocket.accept()

    # ── Auth ──────────────────────────────────────────────────────────────────
    try:
        payload = await get_current_user_ws(token)
        clerk_id = payload["sub"]
    except Exception:
        await websocket.send_json({"type": "error", "message": "Unauthorized"})
        await websocket.close()
        return

    session = {
        "questions": [],
        "current_index": 0,
        "answers": [],
        "cv_content": "",
    }

    try:
        # ── Step 1: receive doc_id to know which CV to use ────────────────────
        init_msg = await websocket.receive_json()
        # expects: { "type": "init", "doc_id": "abc-123" }
        if init_msg.get("type") != "init":
            await websocket.send_json({"type": "error", "message": "Expected init message"})
            return

        doc_id = init_msg["doc_id"]
        collection_name = f"resumes_{clerk_id}"

        # ── Step 2: fetch CV chunks from vector DB ────────────────────────────
        query_embedding = get_query_embedding("skills experience projects education")
        results = query_collection(collection_name, query_embedding, doc_id, n_results=10)
        cv_chunks = results["documents"][0]
        session["cv_content"] = "\n\n".join(cv_chunks)

        # ── Step 3: generate questions ────────────────────────────────────────
        questions = generate_questions(session["cv_content"], num_questions=5)
        session["questions"] = questions

        await websocket.send_json({
            "type": "ready",
            "total_questions": len(questions),
            "message": "Interview starting now!"
        })

        # ── Step 4: interview loop ─────────────────────────────────────────────
        for i, question in enumerate(questions):
            session["current_index"] = i

            # Send question as text
            await websocket.send_json({
                "type": "question",
                "index": i + 1,
                "total": len(questions),
                "text": question,
            })

            # Convert question to speech and send audio bytes
            audio_bytes = text_to_speech(question)
            await websocket.send_bytes(audio_bytes)

            # Wait for user's audio answer
            answer_data = await websocket.receive_bytes()

            # Transcribe the audio
            transcription = speech_to_text(answer_data)

            session["answers"].append({
                "question": question,
                "answer": transcription,
            })

            # Acknowledge transcription so frontend can show it
            await websocket.send_json({
                "type": "transcription",
                "index": i + 1,
                "text": transcription,
            })

        # ── Step 5: interview complete ────────────────────────────────────────
        await websocket.send_json({
            "type": "complete",
            "message": "Interview complete! Thank you.",
            "summary": session["answers"],
        })

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {clerk_id}")
    except Exception as e:
        traceback.print_exc()
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        await websocket.close()