from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.api.transactions import router as transactions_router
from app.db.database import create_db_and_tables, engine
from app.models.transaction import Transaction, TransactionType

app = FastAPI(title="Financeiro Office API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    seed_transactions()


def seed_transactions():
    with Session(engine) as session:
        existing_transaction = session.exec(select(Transaction)).first()

        if existing_transaction:
            return

        transactions = [
            Transaction(
                valor=5000.00,
                data=date(2026, 5, 1),
                descricao="Pagamento de cliente",
                categoria="Receita de serviços",
                tipo=TransactionType.receita,
            ),
            Transaction(
                valor=850.00,
                data=date(2026, 5, 2),
                descricao="Aluguel do escritório",
                categoria="Estrutura",
                tipo=TransactionType.despesa,
            ),
            Transaction(
                valor=230.00,
                data=date(2026, 5, 3),
                descricao="Internet e telefone",
                categoria="Operacional",
                tipo=TransactionType.despesa,
            ),
        ]

        session.add_all(transactions)
        session.commit()


@app.get("/")
def health_check():
    return {"message": "API Financeiro Office rodando"}


app.include_router(transactions_router)