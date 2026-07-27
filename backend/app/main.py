from fastapi import FastAPI

app = FastAPI(title="Vendor Reliability Platform")


@app.get("/")
def root():
    return {"status": "ok"}
