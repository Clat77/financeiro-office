import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    valor: "",
    data: new Date().toISOString().split("T")[0],
    descricao: "",
    categoria: "",
    tipo: "despesa",
  });

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/transactions/`);

      if (!response.ok) {
        throw new Error("Erro ao buscar transações");
      }

      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.valor || !formData.data || !formData.descricao || !formData.categoria) {
      alert("Preencha todos os campos.");
      return;
    }

    const novaTransacao = {
      valor: Number(formData.valor),
      data: formData.data,
      descricao: formData.descricao,
      categoria: formData.categoria,
      tipo: formData.tipo,
    };

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/transactions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(novaTransacao),
      });

      if (!response.ok) {
        throw new Error("Erro ao cadastrar transação");
      }

      setFormData({
        valor: "",
        data: new Date().toISOString().split("T")[0],
        descricao: "",
        categoria: "",
        tipo: "despesa",
      });

      await fetchTransactions();
    } catch (error) {
      console.error("Erro ao cadastrar transação:", error);
      alert("Não foi possível cadastrar a transação.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transactionId) {
    const confirmDelete = confirm("Tem certeza que deseja excluir esta transação?");

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir transação");
      }

      await fetchTransactions();
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      alert("Não foi possível excluir a transação.");
    }
  }

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
          <p>Gestão inicial do fluxo de caixa do escritório</p>
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

      <section className="form-wrapper">
        <h2>Nova transação</h2>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Ex: Pagamento de cliente"
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <input
              type="text"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              placeholder="Ex: Receita de serviços"
            />
          </div>

          <div className="form-group">
            <label>Valor</label>
            <input
              type="number"
              name="valor"
              value={formData.valor}
              onChange={handleChange}
              placeholder="Ex: 500"
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Data</label>
            <input
              type="date"
              name="data"
              value={formData.data}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Tipo</label>
            <select name="tipo" value={formData.tipo} onChange={handleChange}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>

          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar transação"}
          </button>
        </form>
      </section>

      <section className="table-wrapper">
        <h2>Transações</h2>

        {loading ? (
          <p>Carregando transações...</p>
        ) : transactions.length === 0 ? (
          <p>Nenhuma transação cadastrada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Ações</th>
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
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      Excluir
                    </button>
                  </td>
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