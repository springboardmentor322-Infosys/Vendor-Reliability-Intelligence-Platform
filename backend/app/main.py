from fastapi import FastAPI

from app.routers import auth

app = FastAPI(title="Vendor Reliability Platform")

app.include_router(auth.router)


@app.get("/")
def root():
    return {"status": "ok"}
