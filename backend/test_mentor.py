import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
from main import app, chat_mentor, MentorChatRequest
from database import SessionLocal

request = MentorChatRequest(message="நெறிவு என்ன பண்ற?", lang="ta-IN")
db = SessionLocal()

try:
    response = chat_mentor(request, db=db)
    print(response)
except Exception as e:
    import traceback
    traceback.print_exc()
