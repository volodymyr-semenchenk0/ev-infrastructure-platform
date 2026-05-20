# Build stage — install runtime dependencies into an isolated prefix.
FROM python:3.11-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY pyproject.toml .
RUN pip install --no-cache-dir --prefix=/install .

# Runtime stage — slim image with only the installed packages and app code.
FROM python:3.11-slim

WORKDIR /app

# curl is required by the docker-compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY . .

ENV PYTHONPATH=/app

EXPOSE 8000

# Production default: no --reload. docker-compose overrides this for local dev.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
