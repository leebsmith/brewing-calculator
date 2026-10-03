name=server-startup-guide.md
# Batch Brewing Calculator: Server & Emulator Initialization Guide

To run and test the full application stack locally, initialize the following three services in separate terminal windows from the project root (`~/Development/brewing-calculator`):

## Terminal 1: FastAPI Backend
Starts the Python API server with live reloading enabled on port 8000.
```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
