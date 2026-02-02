import logging

from fastapi import APIRouter, HTTPException, status

from ..schemas import AnalysisResult, ImageAnalysisRequest
from ..services.gemini import analyze_produce

router = APIRouter(prefix="/analysis", tags=["analysis"])
logger = logging.getLogger(__name__)


@router.post("", response_model=AnalysisResult)
def analyze(payload: ImageAnalysisRequest) -> AnalysisResult:
    # Translate service errors into HTTP responses for the client.
    try:
        return analyze_produce(payload.image_base64)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gemini analysis failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Analysis failed") from exc
