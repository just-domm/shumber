from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..models import Inventory, InventoryStatus, User, UserRole
from ..schemas import CropInventoryCreate, CropInventoryOut, HeatPoint, Location

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[CropInventoryOut])
def list_inventory(
    crop_name: str | None = None,
    status: InventoryStatus | None = None,
    location: str | None = None,
    db: Session = Depends(get_db),
):
    # Keep filters optional so the UI can drive quick searches.
    query = db.query(Inventory)
    if crop_name:
        query = query.filter(Inventory.crop_name == crop_name)
    if status:
        query = query.filter(Inventory.status == status)
    if location:
        query = query.filter(Inventory.location_name == location)
    items = query.order_by(Inventory.timestamp.desc()).all()

    return [
        CropInventoryOut(
            id=item.id,
            farmer_id=item.farmer_id,
            farmer_name=item.farmer_name,
            crop_name=item.crop_name,
            quantity=item.quantity,
            quality_score=item.quality_score,
            base_price=item.base_price,
            current_bid=item.current_bid,
            highest_bidder_id=item.highest_bidder_id,
            location=Location(name=item.location_name, lat=item.location_lat, lng=item.location_lng),
            image_url=item.image_url,
            timestamp=item.timestamp,
            status=item.status,
            listing_type=item.listing_type,
        )
        for item in items
    ]


@router.post("", response_model=CropInventoryOut, status_code=status.HTTP_201_CREATED)
def create_inventory(
    payload: CropInventoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only farmers are allowed to publish inventory.
    if user.role != UserRole.FARMER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only farmers can post inventory")

    item = Inventory(
        farmer_id=user.id,
        farmer_name=user.name,
        crop_name=payload.crop_name,
        quantity=payload.quantity,
        quality_score=payload.quality_score,
        base_price=payload.base_price,
        current_bid=payload.current_bid,
        location_name=payload.location.name,
        location_lat=payload.location.lat,
        location_lng=payload.location.lng,
        image_url=payload.image_url,
        status=InventoryStatus.AVAILABLE,
        listing_type=payload.listing_type,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return CropInventoryOut(
        id=item.id,
        farmer_id=item.farmer_id,
        farmer_name=item.farmer_name,
        crop_name=item.crop_name,
        quantity=item.quantity,
        quality_score=item.quality_score,
        base_price=item.base_price,
        current_bid=item.current_bid,
        highest_bidder_id=item.highest_bidder_id,
        location=Location(name=item.location_name, lat=item.location_lat, lng=item.location_lng),
        image_url=item.image_url,
        timestamp=item.timestamp,
        status=item.status,
        listing_type=item.listing_type,
    )


@router.get("/heatmap", response_model=list[HeatPoint])
def heatmap_points(
    crop_name: str | None = None,
    status: InventoryStatus | None = None,
    db: Session = Depends(get_db),
):
    # Aggregate by location and crop for heatmap visualization.
    query = db.query(Inventory)
    if crop_name:
        query = query.filter(Inventory.crop_name == crop_name)
    if status:
        query = query.filter(Inventory.status == status)
    items = query.all()

    buckets: dict[tuple[str, float, float, str], int] = defaultdict(int)
    for item in items:
        key = (item.location_name, item.location_lat, item.location_lng, item.crop_name)
        buckets[key] += item.quantity

    results: list[HeatPoint] = []
    for (name, lat, lng, crop), total in buckets.items():
        # Cap the weight so the map stays readable.
        weight = min(1.0, total / 1500)
        results.append(
            HeatPoint(
                crop_name=crop,
                location=Location(name=name, lat=lat, lng=lng),
                total_quantity=total,
                weight=weight,
            )
        )

    return results
