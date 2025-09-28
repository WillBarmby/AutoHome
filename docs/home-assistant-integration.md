# Home Assistant Integration Guide

This project can talk directly to a running Home Assistant instance. The UI
cards in **Dashboard ▸ Home Assistant** (connection status, smart thermostat
calculator, entity browser, etc.) will call into the backend routes under
`/ha/*`, which in turn proxy requests to the real Home Assistant REST API.

Follow the steps below to wire up a local dockerised Home Assistant to the
AutoHome frontend/backend stack.

## 1. Start Home Assistant in Docker

```bash
docker run -d \
  --name homeassistant \
  --privileged \
  --restart=unless-stopped \
  -e TZ=America/New_York \
  -v homeassistant_config:/config \
  -p 8123:8123 \
  homeassistant/home-assistant:stable
```

The first boot can take several minutes. Once it settles, open
<http://localhost:8123> in a browser to finish the onboarding wizard.

## 2. Create a Long‑Lived Access Token

1. In the Home Assistant UI go to **Profile (bottom left avatar)**.
2. Scroll to **Long-Lived Access Tokens** and click **Create Token**.
3. Give it a name (e.g. `autohome-local`) and copy the token. It will only be
   shown once – store it securely.

## 3. Configure the AutoHome Backend

The backend reads its settings from `backend/.env` (loaded via `dotenv`). Create
or update that file so it contains:

```
MOCK_HA=false
HA_BASE_URL=http://localhost:8123
HA_TOKEN=<paste your long-lived token here>
THERMOSTAT_ENTITY_ID=climate.home          # adjust to your actual entity id
DEFAULT_CITY=New York                      # optional
HOME_SQUARE_FOOTAGE=2200                   # optional
HOME_COOLING_UNITS=1                       # optional
```

- Setting `MOCK_HA=false` switches all `/devices` and `/ha/*` routes to hit the
  live API instead of the JSON fixtures under `backend/state/`.
- `HA_BASE_URL` must point to the protocol/host/port where Home Assistant is
  reachable **from the backend process**. When running everything on the same
  machine the default `http://localhost:8123` works.
- `THERMOSTAT_ENTITY_ID` should match the entity you want the smart thermostat
  card to control (check *Developer Tools → States* in Home Assistant for the
  exact id).

Restart the backend so the new environment variables are picked up:

```bash
cd backend
uvicorn backend.main:app --reload  # or whatever command you use normally
```

## 4. Configure the Frontend

Ensure the frontend points at the backend API. For Vite you can create
`frontend/.env.local` (ignored by git) containing:

```
VITE_API_BASE_URL=http://localhost:8000
```

Then run the dev server:

```bash
cd frontend
npm install
npm run dev
```

## 5. Verify the Integration

1. Load <http://localhost:5173> (or whatever Vite’s dev URL is).
2. Open the **Home Assistant** tab. The connection card should now show
   *Connected* (mock mode badge disappears).
3. The climate entity drop-down will list your real thermostats. Selecting one
   and pressing **Calculate & Send to HA** writes sensors back to Home Assistant
   and updates the target temperature.
4. Toggling devices on the Dashboard or Devices page should immediately reflect
   in the Home Assistant UI under **Developer Tools → States**.

## Troubleshooting

- **Connection shows “Disconnected”** – confirm `MOCK_HA=false`, the backend was
  restarted, and the host running the backend can reach `HA_BASE_URL` (try `curl
  http://localhost:8123/api/` with the token).
- **401 Unauthorized** – the token may be missing or expired. Generate a new
  long-lived token and update `HA_TOKEN`.
- **Entity missing from dropdowns** – double check the entity ids in Home
  Assistant and update `THERMOSTAT_ENTITY_ID`. Climatic devices need to be in
  the `climate.*` domain to appear in the thermostat panel.
- **Running everything in Docker Compose** – make sure the backend container can
  reach Home Assistant by service name. Replace `HA_BASE_URL` with
  `http://homeassistant:8123` (or whatever DNS name is resolvable) and ensure
  both containers share a network.

Once these steps are complete, the AutoHome UI operates directly on the live
Home Assistant instance – device toggles, queue commands, and thermostat
operations are all propagated through the backend service layer.

