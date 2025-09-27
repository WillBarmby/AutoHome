"""Routes exposing the natural language parser."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.db import Command
from backend.dependencies import get_parser
from backend.parser import CommandParser, ParsedIntent

from .schemas import ParseRequest

router = APIRouter(prefix="/api/parser", tags=["parser"])


@router.post("/parse", response_model=Command, summary="Parse text into a command")
async def parse_command(
    payload: ParseRequest,
    parser: CommandParser = Depends(get_parser),
) -> Command:
    intent = parser.parse(payload.utterance)
    if intent is None:
        raise HTTPException(status_code=422, detail="Unable to parse utterance")
    return parser.to_command(intent)


@router.post(
    "/parse-intent",
    response_model=ParsedIntent,
    summary="Parse text and return the structured intent",
)
async def parse_intent(
    payload: ParseRequest,
    parser: CommandParser = Depends(get_parser),
) -> ParsedIntent:
    intent = parser.parse(payload.utterance)
    if intent is None:
        raise HTTPException(status_code=422, detail="Unable to parse utterance")
    return intent
