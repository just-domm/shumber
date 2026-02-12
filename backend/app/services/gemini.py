import base64
import json
import os
from typing import Tuple

from google import genai
from google.genai import types

from ..schemas import AnalysisResult, OfflineParseResult


DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _parse_data_url(data_url: str) -> Tuple[str, bytes]:
    # Expect a browser-friendly data URL for uploads.
    if not data_url.startswith("data:"):
        raise ValueError("Invalid image data. Expected data URL format.")

    header, encoded = data_url.split(",", 1)
    mime_type = header.split(";")[0].replace("data:", "") or "image/jpeg"
    return mime_type, base64.b64decode(encoded)


def analyze_produce(image_data_url: str) -> AnalysisResult:
    # Fail fast if the API key isn't configured.
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    mime_type, image_bytes = _parse_data_url(image_data_url)

    client = genai.Client(api_key=api_key)

    prompt = (
        "Analyze this image of agricultural produce. "
        "1. Identify the crop name. "
        "2. Provide a freshness/quality score (0-100). "
        "3. Estimate remaining shelf life (days). "
        "4. Provide a brief market insight. "
        "Return JSON only."
    )

    response = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AnalysisResult,
        ),
    )
    # Prefer structured responses, then fall back to JSON text.
    if response.parsed is not None:
        return AnalysisResult.model_validate(response.parsed)

    if response.text:
        return AnalysisResult.model_validate(json.loads(response.text))

    raise RuntimeError("Empty response from Gemini")


def parse_offline_message(text: str | None = None, audio_data_url: str | None = None) -> OfflineParseResult:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    if not text and not audio_data_url:
        raise ValueError("Provide text or audio_base64 for offline parsing.")

    client = genai.Client(api_key=api_key)

    prompt = (
        "You are the ShambaPulse AI Gateway. Extract harvest details from this farmer's message (Text or Audio). "
        "The farmer might use English, Swahili, or Sheng (slang). "
        "Identify: "
        "- cropName (e.g., Maize, Cabbage, Potatoes) "
        "- quantity (estimate in KG if bags/units mentioned. 1 bag is roughly 90kg unless specified) "
        "- locationName (Must match one of: Molo, Bahati, Naivasha, Gilgil, Njoro, Rongai, Subukia, Kuresoi, Nakuru CBD) "
        "- farmerName (if mentioned, else use \"Farmer\") "
        "Return JSON only."
    )

    parts: list[types.Part | str] = []
    if audio_data_url:
        mime_type, audio_bytes = _parse_data_url(audio_data_url)
        parts.append(prompt)
        parts.append(types.Part.from_bytes(data=audio_bytes, mime_type=mime_type))
    else:
        parts.append(f'{prompt} Farmer Message: \"{text}\"')

    response = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=parts,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=OfflineParseResult,
        ),
    )

    if response.parsed is not None:
        return OfflineParseResult.model_validate(response.parsed)

    if response.text:
        return OfflineParseResult.model_validate(json.loads(response.text))

    raise RuntimeError("Empty response from Gemini")
