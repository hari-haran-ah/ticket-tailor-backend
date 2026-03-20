from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from models.client import Client
from schemas.client import ClientCreate, ClientUpdate, ClientOut, PaginatedClientOut

router = APIRouter(prefix="/api/clients", tags=["Clients"])


@router.get("", response_model=List[ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return db.query(Client).order_by(Client.created_at.desc()).all()


@router.get("/paginated", response_model=PaginatedClientOut)
def list_clients_paginated(
    page: int = 1,
    size: int = 5,
    search: str = "",
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    query = db.query(Client)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Client.name.ilike(search_term),
                Client.domain_name.ilike(search_term),
                Client.contact_email.ilike(search_term)
            )
        )
    
    if sort_by == "name":
        order_col = Client.name
    elif sort_by == "domain_name":
        order_col = Client.domain_name
    elif sort_by == "platform_fee":
        order_col = Client.platform_fee
    elif sort_by == "is_active":
        order_col = Client.is_active
    else:
        order_col = Client.created_at

    if sort_order == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())
        
    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    pages = max(1, (total + size - 1) // size)
    
    return PaginatedClientOut(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    existing = db.query(Client).filter(Client.domain_name == payload.domain_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Client with domain '{payload.domain_name}' already exists",
        )
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    db.delete(client)
    db.commit()


@router.patch("/{client_id}/toggle-status", response_model=ClientOut)
def toggle_client_status(
    client_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Toggle the is_active status of a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    client.is_active = not client.is_active
    db.commit()
    db.refresh(client)
    return client

