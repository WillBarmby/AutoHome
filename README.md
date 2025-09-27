# AutoHome

Minimal home automation backend + frontend scaffold for hackathon demos.

## Backend Quickstart

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --app-dir backend --reload
```

The FastAPI app boots with mock Home Assistant integration by default. Use the endpoints below for manual testing or to wire in the frontend.

## API Endpoints

- `GET /health` – service heartbeat.
- `GET /devices` – rooms and devices from `backend/state/devices.json`.
- `POST /parse` – `{"text": "turn on the bedroom light"}` → structured commands via the minstrel parser wrapper.
- `POST /execute` – `{ "commands": [Command, ...] }` execute immediately (mock HA logs + history write).
- `POST /commands/schedule` – enqueue future commands (requires `run_at`).
- `GET /commands/pending` – inspect the queue.
- `GET /commands/history` – execution history.
- `POST /preferences` – persist preferences and rebuild scheduled thermostat commands.
- `POST /run-due` – manually execute all due commands (handy without a scheduler loop).

`Command` objects follow the schema in `backend/app/models/schema.py`.

## File-based State

State lives entirely in JSON for easy hacking:

- `backend/state/devices.json` – rooms + device registry.
- `backend/state/preferences.json` – latest user preferences.
- `backend/state/commands.json` – pending queue + execution history.

The backend automatically seeds these files if they are missing.

## Mock vs Real Home Assistant

The default mock adapter simply logs actions and records them in history. To talk to a real Home Assistant instance set the following environment variables before starting uvicorn:

```bash
export MOCK_HA=false
export HA_BASE_URL="http://homeassistant.local:8123"
export HA_TOKEN="<long-lived-access-token>"
```

Real mode posts to the HA REST API using each device `id` (override with `ha_entity_id` fields in `devices.json` if needed).

## Repo Structure

- `backend/` – FastAPI app + services.
- `frontend/` – existing UI (unchanged here).
- `reference/` – scratch calculations and legacy scripts.
- `archive/` – historical assets kept for reference.

## Data Contract (Frontend–Backend)

### Entity (device state snapshot)
- `entity_id` (string) — unique identifier, matches HA (`light.living_room`)
- `state` (string) — current state ("on", "off", "72.5")
- `attributes` (dict) — metadata like brightness, friendly_name, hvac_mode
- `icon` (optional string) — Material Design Icon (e.g. "mdi:lightbulb")

### Command (action to perform)
- `entity_id` (string) — device target
- `service` (string) — HA service call (`light.turn_on`, `climate.set_temperature`)
- `data` (optional dict) — additional arguments (`{"brightness": 150}`)
