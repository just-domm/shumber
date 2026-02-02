import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class UserRole(str, enum.Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"


class InventoryStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    NEGOTIATING = "NEGOTIATING"
    SOLD = "SOLD"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    inventory: Mapped[list["Inventory"]] = relationship(back_populates="farmer")


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    farmer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    farmer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    crop_name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    quality_score: Mapped[int] = mapped_column(Integer, nullable=False)
    base_price: Mapped[int] = mapped_column(Integer, nullable=False)
    current_bid: Mapped[int] = mapped_column(Integer, nullable=False)
    highest_bidder_id: Mapped[str | None] = mapped_column(String, nullable=True)
    location_name: Mapped[str] = mapped_column(String(120), nullable=False)
    location_lat: Mapped[float] = mapped_column(Float, nullable=False)
    location_lng: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[InventoryStatus] = mapped_column(Enum(InventoryStatus), default=InventoryStatus.AVAILABLE)

    farmer: Mapped[User] = relationship(back_populates="inventory")
