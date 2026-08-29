import requests
from database import SessionLocal
import models
from jose import jwt
from datetime import datetime, timedelta

# Create a valid token for user 15
payload = {"sub": "techno@gmail.com", "exp": datetime.utcnow() + timedelta(minutes=30)}
token = jwt.encode(payload, "secret_key", algorithm="HS256") # wait, what is the secret key in main.py?

