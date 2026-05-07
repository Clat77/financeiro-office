from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.database import get_session
from app.models.transaction import Transaction, TransactionCreate, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("/", response_model=List[Transaction])
def list_transactions(session: Session = Depends(get_session)):
    transactions = session.exec(select(Transaction)).all()
    return transactions


@router.post("/", response_model=Transaction)
def create_transaction(
    transaction: TransactionCreate,
    session: Session = Depends(get_session)
):
    db_transaction = Transaction.model_validate(transaction)
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction


@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(
    transaction_id: int,
    session: Session = Depends(get_session)
):
    transaction = session.get(Transaction, transaction_id)

    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    return transaction


@router.put("/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    session: Session = Depends(get_session)
):
    transaction = session.get(Transaction, transaction_id)

    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    update_data = transaction_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(transaction, key, value)

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    session: Session = Depends(get_session)
):
    transaction = session.get(Transaction, transaction_id)

    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    session.delete(transaction)
    session.commit()

    return {"message": "Transação deletada com sucesso"}