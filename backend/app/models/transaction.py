from datetime import date
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


class TransactionType(str, Enum):
    receita = "receita"
    despesa = "despesa"


class TransactionBase(SQLModel):
    valor: float
    data: date
    descricao: str
    categoria: str
    tipo: TransactionType


class Transaction(TransactionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(SQLModel):
    valor: Optional[float] = None
    data: Optional[date] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    tipo: Optional[TransactionType] = None