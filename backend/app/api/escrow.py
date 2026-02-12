from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..models import Escrow, EscrowStatus, Inventory, InventoryStatus, User, UserRole
from ..schemas import EscrowOut, EscrowStart

router = APIRouter(prefix="/escrow", tags=["escrow"])
PLATFORM_FEE_RATE = 0.02


def _calculate_platform_fee(amount: int) -> int:
    return max(int(round(amount * PLATFORM_FEE_RATE)), 0)


def _get_inventory(db: Session, inventory_id: str) -> Inventory:
    item = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    return item


def _get_escrow(db: Session, inventory_id: str) -> Escrow:
    escrow = db.query(Escrow).filter(Escrow.inventory_id == inventory_id).first()
    if not escrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow not found")
    return escrow


@router.get("/{inventory_id}", response_model=EscrowOut)
def get_escrow(inventory_id: str, db: Session = Depends(get_db)):
    return _get_escrow(db, inventory_id)


@router.post("/{inventory_id}/start", response_model=EscrowOut, status_code=status.HTTP_201_CREATED)
def start_escrow(
    inventory_id: str,
    payload: EscrowStart,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.BUYER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only buyers can start escrow")
    item = _get_inventory(db, inventory_id)

    requested_quantity = payload.quantity or item.quantity
    if requested_quantity > item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Requested quantity exceeds available stock"
        )
    amount = payload.amount or int(item.current_bid * requested_quantity)
    platform_fee = _calculate_platform_fee(amount)
    item.status = InventoryStatus.NEGOTIATING

    existing = db.query(Escrow).filter(Escrow.inventory_id == inventory_id).first()
    if existing:
        existing.amount = amount
        existing.platform_fee = platform_fee
        existing.requested_quantity = requested_quantity
        existing.buyer_id = user.id
        existing.status = EscrowStatus.PENDING
        db.commit()
        db.refresh(existing)
        return existing

    escrow = Escrow(
        inventory_id=inventory_id,
        buyer_id=user.id,
        amount=amount,
        platform_fee=platform_fee,
        requested_quantity=requested_quantity,
        status=EscrowStatus.PENDING,
    )
    db.add(escrow)
    db.commit()
    db.refresh(escrow)
    return escrow


@router.post("/{inventory_id}/verify", response_model=EscrowOut)
def verify_escrow(
    inventory_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    escrow = _get_escrow(db, inventory_id)
    escrow.status = EscrowStatus.VERIFIED
    db.commit()
    db.refresh(escrow)
    return escrow


@router.post("/{inventory_id}/release", response_model=EscrowOut)
def release_escrow(
    inventory_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    escrow = _get_escrow(db, inventory_id)
    escrow.status = EscrowStatus.RELEASED
    escrow.platform_fee = _calculate_platform_fee(escrow.amount)

    item = _get_inventory(db, inventory_id)
    requested_quantity = escrow.requested_quantity or item.quantity
    remaining = max(item.quantity - requested_quantity, 0)
    item.quantity = remaining
    item.status = InventoryStatus.SOLD if remaining == 0 else InventoryStatus.AVAILABLE

    db.commit()
    db.refresh(escrow)
    return escrow
