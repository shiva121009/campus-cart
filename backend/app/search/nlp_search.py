# Install the Gemini library
# pip install -q -U google-generativeai


import google.generativeai as genai

#API key configuring
GOOGLE_API_KEY = "AIzaSyD2RFYQu55fBCcrhta2KJC_5vQ85y-QQaA"
genai.configure(api_key=GOOGLE_API_KEY)

# model instance created
model = genai.GenerativeModel('gemini-2.5-pro') 

# user_query = "I want shampoo under 1000 in hostel"


prompt = f"""
Extract structured search information from this query:
"{user_query}"

Return as JSON in this format:
{{
  "category": "...",
  "price_min": ...,
  "price_max": ...,
  "brand": "...",
  "item_type": "...",
  "condition": "...",
  "location": "..."
}}
"""

response = model.generate_content(prompt)

print(response.text)
