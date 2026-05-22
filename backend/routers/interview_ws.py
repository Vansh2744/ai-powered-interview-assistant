from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from services.interview import generate_questions, text_to_speech, speech_to_text
from services.vector_store import get_all_chunks_for_document, query_collection
from services.embeddings import get_query_embedding
from db.auth import get_current_user_ws
import json
import traceback

router = APIRouter()

@router.websocket("/interview/ws")
async def interview_websocket(
    websocket: WebSocket,
    token: str = Query(...),
):
    await websocket.accept()

    try:
        payload = await get_current_user_ws(token)
        clerk_id = payload["sub"]
    except HTTPException as e:
        await websocket.send_json({"type": "error", "message": e.detail})
        await websocket.close(code=1008)
        return

    session = {
        "questions": [],
        "current_index": 0,
        "answers": [],
        "cv_content": "",
    }

    try:
        init_msg = await websocket.receive_json()
        if init_msg.get("type") != "init":
            await websocket.send_json({"type": "error", "message": "Expected init message"})
            return

        doc_id = init_msg["doc_id"]
        collection_name = f"resumes_{clerk_id}"

        # ✅ fetch ALL chunks of this specific document — no similarity search
        cv_chunks = get_all_chunks_for_document(collection_name, doc_id)

        if not cv_chunks:
            await websocket.send_json({
                "type": "error",
                "message": f"No CV content found for doc_id={doc_id}. Was it uploaded correctly?"
            })
            return

        session["cv_content"] = "\n\n".join(cv_chunks)
        print(f"[WS] CV loaded: {len(cv_chunks)} chunks, {len(session['cv_content'])} chars")

        # ✅ generate questions from the actual CV content
        questions = generate_questions(session["cv_content"], num_questions=5)
        print(f"[WS] Generated questions: {questions}")
        session["questions"] = questions

        await websocket.send_json({
            "type": "ready",
            "total_questions": len(questions),
            "message": "Interview starting now!"
        })

        for i, question in enumerate(questions):
            session["current_index"] = i

            await websocket.send_json({
                "type": "question",
                "index": i + 1,
                "total": len(questions),
                "text": question,
            })

            audio_bytes = text_to_speech(question)
            await websocket.send_bytes(audio_bytes)

            answer_data = await websocket.receive_bytes()
            transcription = speech_to_text(answer_data)

            session["answers"].append({
                "question": question,
                "answer": transcription,
            })

            await websocket.send_json({
                "type": "transcription",
                "index": i + 1,
                "text": transcription,
            })

        await websocket.send_json({
            "type": "complete",
            "message": "Interview complete! Thank you.",
            "summary": session["answers"],
        })

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {clerk_id}")
    except Exception as e:
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass  # client may already be gone
    finally:
        # ✅ only close if still connected
        if websocket.client_state.value != 3:  # 3 = DISCONNECTED
            try:
                await websocket.close()
            except Exception:
                pass