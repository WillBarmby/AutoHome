"""FastAPI application that exposes parsing utilities."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException

from backend.db import Command

from .executor import BackendExecutor
from .parser.model_parser import ParserService
from .parser.schema import ParseAndExecuteResponse, ParseRequest, ParsedCommand

BACKEND_URL = os.getenv("AUTOHOME_BACKEND_URL", "http://localhost:8000")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    executor = BackendExecutor(BACKEND_URL)
    app.state.executor = executor
    try:
        yield
    finally:
        await executor.aclose()


def create_app() -> FastAPI:
    app = FastAPI(title="AutoHome Parser Service", version="0.2.0", lifespan=lifespan)
    parser_service = ParserService()

    @app.post("/parse", response_model=ParsedCommand)
    async def parse(request: ParseRequest) -> ParsedCommand:
        parsed = parser_service.parse(request.utterance)
        if parsed is None:
            raise HTTPException(status_code=422, detail="Unable to parse utterance")
        return parsed

    @app.post("/parse-and-execute", response_model=ParseAndExecuteResponse)
    async def parse_and_execute(request: ParseRequest) -> ParseAndExecuteResponse:
        parsed = parser_service.parse(request.utterance)
        if parsed is None:
            raise HTTPException(status_code=422, detail="Unable to parse utterance")
        command = Command(
            device_id=parsed.device_id,
            action=parsed.action,
            parameters=parsed.parameters,
        )
        response = await app.state.executor.submit(command)
        return ParseAndExecuteResponse(
            command_id=response.get("id", ""),
            status=response.get("status", "unknown"),
            message=response.get("result") or response.get("error"),
        )

    return app


app = create_app()
from command_router import CommandRouter

router = CommandRouter()

if __name__ == "__main__":
    user_input = "turn off the lights and set downstairs thermostat to 70"
    parsed_cmds = router.parse(user_input)
    print("Parsed:", parsed_cmds)

    for cmd in parsed_cmds:
        status, resp = router.execute(cmd)
        print("Executed:", cmd, "→", status, resp)

# from parser.model_parser import parse_command
# from executor import execute_command

# def main():
#     while True:
#         user_input = input("Command> ")
#         if user_input.lower() in {"exit", "quit"}:
#             break

#         parsed = parse_command(user_input)
#         if parsed:
#             for cmd in parsed:
#                 execute_command(cmd)
#         else:
#             print("⚠️ Could not parse command.")

# if __name__ == "__main__":
#     main()
