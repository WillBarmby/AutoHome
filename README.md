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

## Try the Devices Endpoint

```
curl http://localhost:8000/devices
```

Example response (backed by `backend/state/devices.json`):

```
[
  {
    "entity_id": "light.living_room",
    "state": "on",
    "attributes": {
      "friendly_name": "Living Room Lamp",
      "brightness": 200
    },
    "icon": "mdi:lightbulb"
  },
  {
    "entity_id": "climate.bedroom",
    "state": "72.5",
    "attributes": {
      "friendly_name": "Bedroom Thermostat",
      "hvac_mode": "cool"
    },
    "icon": "mdi:thermometer"
  }
]
```

Call the `/execute` endpoint with:

```
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"light.living_room","service":"light.turn_off"}'
```

Expected response:

```
{
  "status": "ok",
  "received": {
    "entity_id": "light.living_room",
    "service": "light.turn_off",
    "data": null
  }
}
```

## Frontend Environment Flags

Create a `.env` file in `frontend/` (or use `.env.local`) with the following keys:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCKS=true
```

- `VITE_API_BASE_URL` points the frontend at the FastAPI server.
- `VITE_USE_MOCKS` controls whether the UI talks to local mock data (`true`, default) or the backend API (`false`).

Flip `VITE_USE_MOCKS` to `false` and restart `npm run dev` to exercise the real `/devices` and `/execute` endpoints. Set it back to `true` to restore the self-contained demo mode.

The backend `/devices` endpoint now reads directly from `backend/state/devices.json`; edit this file to stage different device states for demos without touching code.

The `/execute` endpoint mutates the same file—toggling a light via the UI (or `curl`) will flip its `state` inside `backend/state/devices.json`, and the next `/devices` call reflects the updated snapshot.
