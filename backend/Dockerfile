# Optimized Dockerfile

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    cargo && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory FIRST
WORKDIR /app

# Copy and install dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy only the backend source into /app
COPY backend/ .

# Expose port (Railway overrides with $PORT)
EXPOSE 8000

# Shell form so $PORT env var is expanded by Railway at runtime
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
