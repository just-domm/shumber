from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from .models import EscrowStatus, InventoryStatus, ListingType, UserRole


class Location(BaseModel):
    name: str
    lat: float
    lng: float


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole
    location: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    location: str
    rating: Optional[float] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class CropInventoryBase(BaseModel):
    farmer_id: str
    farmer_name: str
    crop_name: str
    quantity: int
    quality_score: int
    base_price: int
    current_bid: int
    highest_bidder_id: Optional[str] = None
    location: Location
    image_url: Optional[str] = None
    status: InventoryStatus = InventoryStatus.AVAILABLE
    listing_type: ListingType = ListingType.BIDDING


class CropInventoryCreate(BaseModel):
    crop_name: str
    quantity: int
    quality_score: int
    base_price: int
    current_bid: int
    location: Location
    image_url: Optional[str] = None
    listing_type: ListingType = ListingType.BIDDING


class CropInventoryOut(CropInventoryBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True


class HeatPoint(BaseModel):
    crop_name: str
    location: Location
    total_quantity: int
    weight: float


class ImageAnalysisRequest(BaseModel):
    image_base64: str


class AnalysisResult(BaseModel):
    cropName: str
    freshnessScore: float
    estimatedShelfLife: str
    marketInsight: str


class OfflineParseRequest(BaseModel):
    text: Optional[str] = None
    audio_base64: Optional[str] = None

    @model_validator(mode="after")
    def validate_payload(self):
        if not self.text and not self.audio_base64:
            raise ValueError("Provide text or audio_base64 for offline parsing.")
        return self


class OfflineParseResult(BaseModel):
    cropName: str
    quantity: float
    locationName: str
    farmerName: Optional[str] = None


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: str
    inventory_id: str
    sender_id: str
    text: str
    timestamp: datetime

    class Config:
        from_attributes = True


class EscrowStart(BaseModel):
    amount: Optional[int] = None


class BidCreate(BaseModel):
    amount: int = Field(gt=0)


class InventoryUpdate(BaseModel):
    current_bid: Optional[int] = Field(default=None, gt=0)
    listing_type: Optional[ListingType] = None


class EscrowOut(BaseModel):
    id: str
    inventory_id: str
    buyer_id: str
    amount: int
    status: EscrowStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
