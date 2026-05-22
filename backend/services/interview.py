from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))

# ── Question Generation ───────────────────────────────────────────────────────

question_prompt = ChatPromptTemplate.from_template("""
You are a professional technical interviewer. Based on the following CV content, 
generate {num_questions} interview questions. 

CV Content:
{cv_content}

Previous questions asked (do not repeat):
{previous_questions}

Rules:
- Ask questions relevant to their specific experience and skills
- Mix technical and behavioral questions
- Be concise, one question at a time
- Return ONLY a JSON array of question strings, nothing else
- Example: ["Question 1?", "Question 2?"]
""")

def generate_questions(cv_content: str, previous_questions: list[str] = [], num_questions: int = 5) -> list[str]:
    chain = question_prompt | llm
    response = chain.invoke({
        "cv_content": cv_content,
        "previous_questions": "\n".join(previous_questions) if previous_questions else "None",
        "num_questions": num_questions,
    })
    import json, re
    text = response.content.strip()
    match = re.search(r'\[.*?\]', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


# ── Text-to-Speech ────────────────────────────────────────────────────────────

def text_to_speech(text: str) -> bytes:
    response = groq_client.audio.speech.create(
        model="canopylabs/orpheus-v1-english",
        voice="troy",
        input=text,
        response_format="wav",
    )
    return response.read()


# ── Speech-to-Text ────────────────────────────────────────────────────────────

def speech_to_text(audio_bytes: bytes, filename: str = "audio.wav") -> str:
    import io
    transcription = groq_client.audio.transcriptions.create(
        model="whisper-large-v3",
        file=(filename, io.BytesIO(audio_bytes), "audio/wav"),
    )
    return transcription.text.strip()