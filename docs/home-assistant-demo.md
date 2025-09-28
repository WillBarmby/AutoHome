# Home Assistant Demo Stack

This folder contains the configuration used by the Home Assistant container defined in `docker-compose.yml`. The goal is to showcase lighting and thermostat changes using the built-in `demo` integration.

## Prerequisites
- Docker Desktop running locally.
- `docker compose` available in your shell (ships with Docker Desktop >= 4.9).

## First Run
1. From the project root run `docker compose up -d`.
2. Open `http://localhost:8123` in your browser.
3. Complete the on-boarding wizard. The demo integration loads automatically; you can skip account creation for quick tests by using local authentication.
4. Navigate to **Developer Tools → Scripts** to run the helper scripts:
   - `Activate Demo Evening Scene`
   - `Activate Demo Daytime Scene`

These scripts call scene definitions under `ha-config/scenes.yaml` to highlight the difference between warm evening lighting with a cooler thermostat setting, and a daytime setup.

You can edit the scene definitions directly inside `ha-config/scenes.yaml` once the container is stopped. Restart the stack to pick up changes (`docker compose restart homeassistant`).

## Shutting Down
Run `docker compose down` from the project root to stop and remove the container while preserving the configuration under `ha-config/`.

## Troubleshooting
- **Entity names differ**: After the container is up, check the actual entity IDs in **Developer Tools → States** and update the scenes/scripts accordingly.
- **Port already in use**: Adjust the port mapping in `docker-compose.yml` (e.g. `- "8124:8123"`).
