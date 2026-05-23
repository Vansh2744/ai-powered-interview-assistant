from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))


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


def text_to_speech(text: str) -> bytes:
    response = groq_client.audio.speech.create(
        model="canopylabs/orpheus-v1-english",
        voice="troy",
        input=text,
        response_format="wav",
    )
    return response.read()


def speech_to_text(audio_bytes: bytes, filename: str = "audio.wav") -> str:
    import io
    transcription = groq_client.audio.transcriptions.create(
        model="whisper-large-v3",
        file=(filename, io.BytesIO(audio_bytes), "audio/wav"),
    )
    return transcription.text.strip()

def generate_feedback(cv_content: str, qa_pairs: list[dict]) -> dict:
    qa_text = "\n\n".join([
        f"Q{i+1}: {qa['question']}\nAnswer: {qa['answer']}"
        for i, qa in enumerate(qa_pairs)
    ])

    prompt = ChatPromptTemplate.from_template("""
    You are an expert career coach. Evaluate this interview based on the CV and answers given.

    CV Content:
    {cv_content}

    Interview Q&A:
    {qa_text}

    Return ONLY a valid JSON object with exactly these keys, nothing else:
    {{
    "overall_score": <integer 0-100>,
    "summary": "<2-3 sentence overall assessment>",
    "cv_feedback": "<feedback on their CV — strengths and gaps>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
    }}
    """)

    chain = prompt | llm
    response = chain.invoke({"cv_content": cv_content, "qa_text": qa_text})

    import json, re
    text = response.content.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    return json.loads(match.group() if match else text)