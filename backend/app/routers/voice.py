"""
voice.py — Mei Arivu Voice Pipeline Router
===========================================
Houses the Bhashini API integration endpoints.

Current Status: STUB MODE (BHASHINI_API_KEY pending government approval)
─────────────────────────────────────────────────────────────────────────
These endpoints are fully documented in the OpenAPI spec (/docs) and
accept real network payloads. When BHASHINI_API_KEY is approved:
  1. Replace the stub returns with real httpx calls to the Bhashini API
  2. Set USE_BHASHINI_BACKEND=true in the React frontend config flag

Routes:
  POST /api/voice/process-speech   — Audio binary → transcribed text
  POST /api/voice/generate-speech  — LLM response text → audio stream URL
"""

import os
import io
import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(
    prefix="",          # prefix is set in main.py via include_router
    tags=["Voice Pipeline"],
)

# ── Bhashini Language Code Map ────────────────────────────────────────────────
SUPPORTED_LANGUAGES: dict[str, str] = {
    "ta-IN": "Tamil",
    "hi-IN": "Hindi",
    "en-US": "English",
}

# ─── Pydantic Models (appear cleanly in /docs) ────────────────────────────────

class SpeechTranscriptResponse(BaseModel):
    """Returned by /process-speech after Bhashini ASR processing."""
    transcript: str = Field(
        ...,
        description="Transcribed text from the uploaded audio.",
        example="மேல் பைல் 2-ஐ சோதிக்கவும்",
    )
    language_code: str = Field(
        ...,
        description="BCP-47 language tag of the detected/requested language.",
        example="ta-IN",
    )
    language_name: str = Field(
        ...,
        description="Human-readable language name.",
        example="Tamil",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="ASR confidence score [0.0–1.0]. 0.0 in stub mode.",
        example=0.92,
    )
    stub_mode: bool = Field(
        default=True,
        description="True while BHASHINI_API_KEY is pending. Replace stub with real API call.",
    )


class GenerateSpeechRequest(BaseModel):
    """Request body for /generate-speech."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="The LLM response text to be synthesised into speech.",
        example="Site 3 has critical moisture levels. Immediate pile turning is recommended.",
    )
    language_code: str = Field(
        default="en-US",
        description="BCP-47 language tag for TTS voice selection.",
        example="ta-IN",
    )


class GenerateSpeechResponse(BaseModel):
    """Returned by /generate-speech with a playable audio URL."""
    audio_url: str = Field(
        ...,
        description=(
            "URL to the generated audio file. In stub mode this is a placeholder. "
            "In production this will be a signed Bhashini CDN URL or a streaming endpoint."
        ),
        example="/api/voice/audio/placeholder.mp3",
    )
    language_code: str = Field(..., example="ta-IN")
    character_count: int = Field(
        ...,
        description="Number of characters in the input text (used for quota tracking).",
        example=88,
    )
    stub_mode: bool = Field(
        default=True,
        description="True while BHASHINI_API_KEY is pending.",
    )


# ── Helper — validate Bhashini API key ───────────────────────────────────────
def _require_bhashini_key() -> str:
    """
    Reads BHASHINI_API_KEY from environment. Raises 503 if missing/placeholder.
    Called only in the Bhashini code path; stub code path skips this check.
    """
    key = os.environ.get("BHASHINI_API_KEY", "")
    if not key or key in ("YOUR_BHASHINI_KEY_HERE", "your_bhashini_key_here", ""):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "BHASHINI_API_KEY not configured",
                "message": (
                    "The Bhashini government API key is pending approval. "
                    "Set BHASHINI_API_KEY in backend/.env to enable full ASR/TTS. "
                    "The frontend is currently operating in browser-native fallback mode."
                ),
            },
        )
    return key


# ── Endpoint 1: Audio → Transcript ──────────────────────────────────────────
@router.post(
    "/process-speech",
    response_model=SpeechTranscriptResponse,
    summary="Convert audio recording to text via Bhashini ASR",
    description=(
        "Accepts a raw audio file (WAV/WEBM/OGG) and an optional language hint. "
        "When `BHASHINI_API_KEY` is configured this endpoint will forward the binary "
        "to the Bhashini Automatic Speech Recognition (ASR) pipeline and return a "
        "transcript. Until the key is approved the endpoint returns a documented stub "
        "response so the frontend can be built and tested end-to-end."
    ),
    responses={
        200: {"description": "Transcript returned successfully (or stub in pending mode)."},
        400: {"description": "Invalid file type or empty payload."},
        503: {"description": "Bhashini API key not yet configured."},
    },
)
async def process_speech(
    audio_file: UploadFile = File(
        ...,
        description="Raw audio blob (WAV, WEBM, OGG) captured via MediaRecorder.",
    ),
    language_code: Annotated[str, Form()] = "en-US",
) -> SpeechTranscriptResponse:
    """
    Audio → Text via Bhashini ASR.

    Stub behaviour (USE_BHASHINI_BACKEND=false):
    ─────────────────────────────────────────────
    Returns a placeholder transcript so the frontend pipeline can be tested
    without live API credentials.

    Production behaviour (when BHASHINI_API_KEY is set):
    ──────────────────────────────────────────────────────
    1. Validate content type (audio/*)
    2. Read the audio bytes from the upload
    3. POST to Bhashini ASR endpoint with the language code
    4. Parse and return the transcript + confidence score
    """
    # ── Validate language code ────────────────────────────────────────────────
    if language_code not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language_code '{language_code}'. Supported: {list(SUPPORTED_LANGUAGES.keys())}",
        )

    # ── Validate file type ────────────────────────────────────────────────────
    content_type = audio_file.content_type or ""
    if not content_type.startswith("audio/") and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected audio/* content type, got '{content_type}'.",
        )

    # ── Read audio bytes (needed for both stub logging and real API) ──────────
    audio_bytes: bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Received empty audio payload.",
        )

    logger.info(
        "process-speech: received %d bytes | lang=%s | file=%s",
        len(audio_bytes),
        language_code,
        audio_file.filename or "blob",
    )

    # ── Check if real Bhashini key is available ───────────────────────────────
    bhashini_key = os.environ.get("BHASHINI_API_KEY", "")
    key_is_live = bhashini_key and bhashini_key not in (
        "YOUR_BHASHINI_KEY_HERE",
        "your_bhashini_key_here",
    )

    if key_is_live:
        # ──────────────────────────────────────────────────────────────────────
        # PRODUCTION PATH — uncomment and implement when Bhashini key arrives
        # ──────────────────────────────────────────────────────────────────────
        # import httpx
        # BHASHINI_ASR_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        # async with httpx.AsyncClient(timeout=30) as client:
        #     resp = await client.post(
        #         BHASHINI_ASR_URL,
        #         headers={"Authorization": bhashini_key, "Content-Type": "application/json"},
        #         json={
        #             "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": language_code[:2]}}}],
        #             "inputData": {"audio": [{"audioContent": base64.b64encode(audio_bytes).decode()}]},
        #         },
        #     )
        #     resp.raise_for_status()
        #     data = resp.json()
        #     transcript = data["pipelineResponse"][0]["output"][0]["source"]
        #     return SpeechTranscriptResponse(
        #         transcript=transcript,
        #         language_code=language_code,
        #         language_name=SUPPORTED_LANGUAGES[language_code],
        #         confidence=0.95,
        #         stub_mode=False,
        #     )
        pass  # Remove this `pass` when activating the production path above

    # ── STUB RESPONSE (pending Bhashini approval) ─────────────────────────────
    lang_name = SUPPORTED_LANGUAGES.get(language_code, "Unknown")
    placeholder_transcripts = {
        "ta-IN": "மேல் தொகுதியின் நிலையை சோதிக்கவும்",
        "hi-IN": "साइट की स्थिति जांचें",
        "en-US": "[Bhashini ASR pending] — audio received successfully",
    }
    return SpeechTranscriptResponse(
        transcript=placeholder_transcripts.get(language_code, "[audio received]"),
        language_code=language_code,
        language_name=lang_name,
        confidence=0.0,
        stub_mode=True,
    )


# ── Endpoint 2: Text → Audio Stream URL ──────────────────────────────────────
@router.post(
    "/generate-speech",
    response_model=GenerateSpeechResponse,
    summary="Convert LLM response text to audio via Bhashini TTS",
    description=(
        "Accepts the Groq LLM response string and a language code, then uses the "
        "Bhashini Text-to-Speech (TTS) pipeline to generate a spoken audio file. "
        "Returns a URL the frontend can play via an HTML <audio> element or the "
        "Web Audio API. Stub mode returns a placeholder URL until the key is active."
    ),
    responses={
        200: {"description": "Audio URL returned (or stub placeholder)."},
        400: {"description": "Invalid language code or empty text."},
        503: {"description": "Bhashini API key not yet configured."},
    },
)
async def generate_speech(payload: GenerateSpeechRequest) -> GenerateSpeechResponse:
    """
    Text → Audio URL via Bhashini TTS.

    Stub behaviour (USE_BHASHINI_BACKEND=false):
    ─────────────────────────────────────────────
    Returns a placeholder audio_url so the frontend pipeline remains intact.
    The frontend will fall back to window.speechSynthesis when stub_mode=true.

    Production behaviour (when BHASHINI_API_KEY is set):
    ──────────────────────────────────────────────────────
    1. POST text to Bhashini TTS pipeline
    2. Receive base64-encoded audio or a CDN URL
    3. Return the playable URL to the frontend
    """
    # ── Validate language code ────────────────────────────────────────────────
    if payload.language_code not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language_code '{payload.language_code}'. Supported: {list(SUPPORTED_LANGUAGES.keys())}",
        )

    logger.info(
        "generate-speech: %d chars | lang=%s",
        len(payload.text),
        payload.language_code,
    )

    # ── Check if real Bhashini key is available ───────────────────────────────
    bhashini_key = os.environ.get("BHASHINI_API_KEY", "")
    key_is_live = bhashini_key and bhashini_key not in (
        "YOUR_BHASHINI_KEY_HERE",
        "your_bhashini_key_here",
    )

    if key_is_live:
        # ──────────────────────────────────────────────────────────────────────
        # PRODUCTION PATH — uncomment and implement when Bhashini key arrives
        # ──────────────────────────────────────────────────────────────────────
        # import httpx, base64
        # BHASHINI_TTS_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        # async with httpx.AsyncClient(timeout=30) as client:
        #     resp = await client.post(
        #         BHASHINI_TTS_URL,
        #         headers={"Authorization": bhashini_key, "Content-Type": "application/json"},
        #         json={
        #             "pipelineTasks": [{"taskType": "tts", "config": {"language": {"sourceLanguage": payload.language_code[:2]}, "gender": "female"}}],
        #             "inputData": {"input": [{"source": payload.text}]},
        #         },
        #     )
        #     resp.raise_for_status()
        #     data = resp.json()
        #     audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
        #     # Store temporarily or stream — for now return data URI
        #     audio_url = f"data:audio/wav;base64,{audio_b64}"
        #     return GenerateSpeechResponse(
        #         audio_url=audio_url,
        #         language_code=payload.language_code,
        #         character_count=len(payload.text),
        #         stub_mode=False,
        #     )
        pass  # Remove this `pass` when activating the production path above

    # ── STUB RESPONSE (pending Bhashini approval) ─────────────────────────────
    return GenerateSpeechResponse(
        audio_url="/api/voice/audio/stub_placeholder.mp3",
        language_code=payload.language_code,
        character_count=len(payload.text),
        stub_mode=True,
    )
