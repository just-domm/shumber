from datetime import datetime

from sqlalchemy.orm import Session

from .models import Inventory, InventoryStatus, User, UserRole
from .core.security import hash_password


def seed_data(db: Session) -> None:
    # Only seed once to avoid duplicate demo data.
    if db.query(User).count() > 0:
        return

    farmer_juma = User(
        name="Mzee Juma",
        email="mzee@example.com",
        role=UserRole.FARMER,
        location="Njoro",
        hashed_password=hash_password("password123"),
    )
    farmer_jane = User(
        name="Jane Koech",
        email="jane@example.com",
        role=UserRole.FARMER,
        location="Njoro",
        hashed_password=hash_password("password123"),
    )
    farmer_sarah = User(
        name="Sarah Wambui",
        email="sarah@example.com",
        role=UserRole.FARMER,
        location="Bahati",
        hashed_password=hash_password("password123"),
    )
    farmer_john = User(
        name="John Koech",
        email="john@example.com",
        role=UserRole.FARMER,
        location="Njoro",
        hashed_password=hash_password("password123"),
    )
    buyer_wilson = User(
        name="Wilson Mwangi",
        email="wilson@example.com",
        role=UserRole.BUYER,
        location="Nakuru",
        hashed_password=hash_password("password123"),
    )
    buyer_aisha = User(
        name="Aisha Otieno",
        email="aisha@example.com",
        role=UserRole.BUYER,
        location="Naivasha",
        hashed_password=hash_password("password123"),
    )
    buyer_daniel = User(
        name="Daniel Kiptoo",
        email="daniel@example.com",
        role=UserRole.BUYER,
        location="Nakuru CBD",
        hashed_password=hash_password("password123"),
    )
    db.add_all([
        farmer_juma,
        farmer_jane,
        farmer_sarah,
        farmer_john,
        buyer_wilson,
        buyer_aisha,
        buyer_daniel,
    ])
    db.flush()

    items = [
        Inventory(
            farmer_id=farmer_juma.id,
            farmer_name=farmer_juma.name,
            crop_name="Potatoes (Shangi)",
            quantity=1200,
            quality_score=88,
            base_price=45,
            current_bid=48,
            location_name="Njoro",
            location_lat=-0.3411,
            location_lng=35.9400,
            timestamp=datetime.utcnow(),
            status=InventoryStatus.AVAILABLE,
        ),
        Inventory(
            farmer_id=farmer_jane.id,
            farmer_name=farmer_jane.name,
            crop_name="Carrots",
            quantity=450,
            quality_score=92,
            base_price=30,
            current_bid=32,
            location_name="Njoro",
            location_lat=-0.3450,
            location_lng=35.9450,
            timestamp=datetime.utcnow(),
            status=InventoryStatus.AVAILABLE,
        ),
        Inventory(
            farmer_id=farmer_sarah.id,
            farmer_name=farmer_sarah.name,
            crop_name="Sukuma Wiki",
            quantity=300,
            quality_score=95,
            base_price=20,
            current_bid=22,
            location_name="Bahati",
            location_lat=-0.1477,
            location_lng=36.1558,
            timestamp=datetime.utcnow(),
            status=InventoryStatus.AVAILABLE,
        ),
        Inventory(
            farmer_id=farmer_john.id,
            farmer_name=farmer_john.name,
            crop_name="Carrots",
            quantity=800,
            quality_score=72,
            base_price=35,
            current_bid=35,
            location_name="Njoro",
            location_lat=-0.3411,
            location_lng=35.9400,
            timestamp=datetime.utcnow(),
            status=InventoryStatus.AVAILABLE,
        ),
    ]

    db.add_all(items)
    db.commit()
