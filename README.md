# AutoHome

A smart home automation project. The backend now exposes device, command, guardrail, and parser APIs that can be wired into the frontend experience.

## Project Structure

- `backend/` - FastAPI service providing device management, guardrails, automation command execution, and a rule-based parser endpoint.
- `parser-backend/` - Companion FastAPI microservice that reuses the shared parser and can forward commands to the backend.
- `frontend/` - React application (untouched in this change set).
- `archive/` - Legacy prototypes, duplicated docs, and sample scripts retained for reference.

## Backend Quickstart

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Key Endpoints

- `GET /api/health` - Service health status.
- `GET /api/devices` - List registered devices.
- `POST /api/commands` - Queue a command after guardrail validation.
- `GET /api/guardrails` - Inspect active guardrails.
- `POST /api/parser/parse` - Convert natural language into a structured command.

## Parser Service Quickstart

```bash
cd parser-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

The parser service exposes `/parse` and `/parse-and-execute` endpoints. The latter forwards validated commands to the backend running at `http://localhost:8000`.

## Frontend

The frontend continues to run against mock data. Once it is wired to the backend APIs above the project will support end-to-end device automation.
