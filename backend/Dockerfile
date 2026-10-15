# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: builder — install Python dependencies into a virtual environment
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools needed for some native extensions (e.g. asyncpg, bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment so the runtime stage can copy it cleanly
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only the dependency manifest first to exploit layer caching
COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: runtime — lean image that runs the application
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

LABEL org.opencontainers.image.title="fleetmaint-backend" \
      org.opencontainers.image.description="Fleet Maintenance Backend API" \
      org.opencontainers.image.version="0.1.0"

# Runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy the application source and migration assets
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./alembic.ini
COPY pyproject.toml ./pyproject.toml

# Create a non-root user for security
RUN addgroup --system fleetmaint && adduser --system --ingroup fleetmaint fleetmaint
RUN chown -R fleetmaint:fleetmaint /app
USER fleetmaint

# Expose the default application port (overridden by PORT env var at runtime)
EXPOSE 8000

# Entrypoint: run Alembic migrations then start Uvicorn.
# PORT, HOST, and WORKERS are read from environment variables at container start.
CMD alembic upgrade head && \
    uvicorn app.main:app \
        --host "${HOST:-0.0.0.0}" \
        --port "${PORT:-8000}" \
        --workers "${WORKERS:-1}"
