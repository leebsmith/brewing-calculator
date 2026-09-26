# ---------------------------------------------------------
# Stage 1: Builder
# ---------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*

# Configure uv to compile bytecode for faster startup and copy files instead of symlinking
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Cache the dependency layer by copying only the dependency definitions first
COPY uv.lock pyproject.toml ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy the actual application code and sync again to install the project
COPY . /app
RUN uv sync --frozen --no-dev


# ---------------------------------------------------------
# Stage 2: Runtime
# ---------------------------------------------------------
FROM python:3.13-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the pre-built virtual environment and the application code from the builder stage
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app

# Place the virtual environment executable binaries at the front of the PATH
ENV PATH="/app/.venv/bin:$PATH"

# Cloud Run defaults to port 8080
ENV PORT=8080
EXPOSE 8080

# Run the production ASGI server
CMD ["fastapi", "run", "app/main.py", "--port", "8080"]