FROM python:3.12-slim

WORKDIR /app

# Install compilation packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code and dataset
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/
COPY data/ /app/data/

# Set working directory to backend module path
ENV PYTHONPATH=/app/backend

# Expose server port
EXPOSE 8000

# Start server process
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
