import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function fetchTransactions() {
    try {
      const response = await fetch(`${API_URL}/transactions/`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    } finally {
      setLoading(false);
    }
  }

  fetchTransactions();
}, []);

  const receitas = transactions
    .filter((transaction) => transaction.tipo === "receita")
    .reduce((total, transaction) => total + transaction.valor, 0);

  const despesas = transactions
    .filter((transaction) => transaction.tipo === "despesa")
    .reduce((total, transaction) => total + transaction.valor, 0);

  const saldo = receitas - despesas;

  return (
    <main className="container">
      <section className="header">
        <div>
          <h1>Dashboard Financeiro</h1>
          <p>Visão inicial do fluxo de caixa do escritório</p>
        </div>
      </section>

      <section className="cards">
        <div className="card">
          <span>Receitas</span>
          <strong>R$ {receitas.toFixed(2)}</strong>
        </div>

        <div className="card">
          <span>Despesas</span>
          <strong>R$ {despesas.toFixed(2)}</strong>
        </div>

        <div className="card saldo">
          <span>Saldo</span>
          <strong>R$ {saldo.toFixed(2)}</strong>
        </div>
      </section>

      <section className="table-wrapper">
        <h2>Transações</h2>

        {loading ? (
          <p>Carregando transações...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.data}</td>
                  <td>{transaction.descricao}</td>
                  <td>{transaction.categoria}</td>
                  <td>
                    <span className={`badge ${transaction.tipo}`}>
                      {transaction.tipo}
                    </span>
                  </td>
                  <td>R$ {transaction.valor.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default App;