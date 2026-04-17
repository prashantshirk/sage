import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

print(f"Testing Gemini with key: {api_key[:5]}...{api_key[-5:]}")
print(f"Model: {model_name}")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hello, are you working?")
    print("Response SUCCESS:")
    print(response.text)
except Exception as e:
    print("Response FAILED:")
    print(e)
