import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class UserRole(str, enum.Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"


class InventoryStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    NEGOTIATING = "NEGOTIATING"
    SOLD = "SOLD"


class ListingType(str, enum.Enum):
    BIDDING = "BIDDING"
    FIXED = "FIXED"


class EscrowStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    RELEASED = "RELEASED"


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
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[InventoryStatus] = mapped_column(Enum(InventoryStatus), default=InventoryStatus.AVAILABLE)
    listing_type: Mapped[ListingType] = mapped_column(
        Enum(ListingType, name="listing_type"),
        default=ListingType.BIDDING,
        nullable=False,
    )

    farmer: Mapped[User] = relationship(back_populates="inventory")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inventory_id: Mapped[str] = mapped_column(String, ForeignKey("inventory.id"), nullable=False)
    sender_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    text: Mapped[str] = mapped_column(String(2000), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Escrow(Base):
    __tablename__ = "escrow"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inventory_id: Mapped[str] = mapped_column(String, ForeignKey("inventory.id"), nullable=False, unique=True)
    buyer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    platform_fee: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requested_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[EscrowStatus] = mapped_column(Enum(EscrowStatus), default=EscrowStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def payout_amount(self) -> int:
        return max(self.amount - (self.platform_fee or 0), 0)
