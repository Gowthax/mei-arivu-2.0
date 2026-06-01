import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

try:
    completion = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are a test."},
            {"role": "user",   "content": "Hello"},
        ],
        temperature=0.5,
        max_tokens=150,
    )
    print(completion.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")
