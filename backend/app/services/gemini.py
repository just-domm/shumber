import base64
import json
import os
from typing import Tuple

from google import genai
from google.genai import types

from ..schemas import AnalysisResult


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
