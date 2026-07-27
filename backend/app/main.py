from fastapi import FastAPI

from app.routers import admin, auth

app = FastAPI(title="Vendor Reliability Platform")

app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"status": "ok"}
