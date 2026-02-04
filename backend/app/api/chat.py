from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..models import Inventory, Message, User
from ..schemas import MessageCreate, MessageOut

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/{inventory_id}/messages", response_model=list[MessageOut])
def list_messages(inventory_id: str, db: Session = Depends(get_db)):
    exists = db.query(Inventory.id).filter(Inventory.id == inventory_id).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    results = (
        db.query(Message, User.name)
        .join(User, User.id == Message.sender_id)
        .filter(Message.inventory_id == inventory_id)
        .order_by(Message.timestamp.asc())
        .all()
    )
    return [
        MessageOut(
            id=msg.id,
            inventory_id=msg.inventory_id,
            sender_id=msg.sender_id,
            text=msg.text,
            timestamp=msg.timestamp,
            sender_name=sender_name,
        )
        for msg, sender_name in results
    ]


@router.post("/{inventory_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def create_message(
    inventory_id: str,
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")

    message = Message(
        inventory_id=inventory_id,
        sender_id=user.id,
        text=payload.text,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return MessageOut(
        id=message.id,
        inventory_id=message.inventory_id,
        sender_id=message.sender_id,
        text=message.text,
        timestamp=message.timestamp,
        sender_name=user.name,
    )
