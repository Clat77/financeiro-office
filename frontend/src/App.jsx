import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
);

const BUDGETS_STORAGE_KEY = "financeiro-office-budgets";

const CATEGORY_SUGGESTIONS = {
  receita: [
    "Receita de serviços",
    "Consultoria",
    "Honorários",
    "Reembolso",
    "Venda de produto",
    "Outras receitas",
  ],
  despesa: [
    "Estrutura",
    "Operacional",
    "Tecnologia",
    "Marketing",
    "Impostos",
    "Pessoal",
    "Materiais",
    "Outras despesas",
  ],
};

function formatMonthLabel(monthValue) {
  const [year, month] = monthValue.split("-");

  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  const escapedValue = stringValue.replaceAll('"', '""');

  return `"${escapedValue}"`;
}

function loadStoredBudgets() {
  try {
    const storedBudgets = localStorage.getItem(BUDGETS_STORAGE_KEY);

    if (!storedBudgets) {
      return {};
    }

    return JSON.parse(storedBudgets);
  } catch (error) {
    console.error("Erro ao carregar orçamentos salvos:", error);
    return {};
  }
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("todos");
  const [selectedType, setSelectedType] = useState("todos");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [budgets, setBudgets] = useState(loadStoredBudgets);
  const [budgetForm, setBudgetForm] = useState({
    categoria: "",
    limite: "",
  });

  const [editingTransactionId, setEditingTransactionId] = useState(null);

  const [formData, setFormData] = useState({
    valor: "",
    data: getTodayDate(),
    descricao: "",
    categoria: "",
    tipo: "despesa",
  });

  const isEditing = editingTransactionId !== null;

  useEffect(() => {
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      try {
        const response = await fetch(`${API_URL}/transactions/`);

        if (!response.ok) {
          throw new Error("Erro ao buscar transações");
        }

        const data = await response.json();

        if (isMounted) {
          setTransactions(data);
        }
      } catch (error) {
        console.error("Erro ao buscar transações:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.data);
      const dateB = new Date(b.data);

      return dateB - dateA;
    });
  }, [transactions]);

  const availableMonths = useMemo(() => {
    const months = sortedTransactions.map((transaction) =>
      transaction.data.slice(0, 7)
    );

    return [...new Set(months)].sort().reverse();
  }, [sortedTransactions]);

  const availableCategories = useMemo(() => {
    const categories = sortedTransactions
      .map((transaction) => transaction.categoria)
      .filter(Boolean);

    return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
  }, [sortedTransactions]);

  const budgetCategoryOptions = useMemo(() => {
    const defaultCategories = [
      ...CATEGORY_SUGGESTIONS.receita,
      ...CATEGORY_SUGGESTIONS.despesa,
    ];

    return [...new Set([...defaultCategories, ...availableCategories])].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [availableCategories]);

  const categorySuggestionsForType = useMemo(() => {
    const defaultSuggestions = CATEGORY_SUGGESTIONS[formData.tipo] || [];
    const categoriesFromTransactions = sortedTransactions
      .filter((transaction) => transaction.tipo === formData.tipo)
      .map((transaction) => transaction.categoria)
      .filter(Boolean);

    return [...new Set([...defaultSuggestions, ...categoriesFromTransactions])].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [formData.tipo, sortedTransactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sortedTransactions.filter((transaction) => {
      const matchesMonth =
        selectedMonth === "todos" || transaction.data.startsWith(selectedMonth);

      const matchesType =
        selectedType === "todos" || transaction.tipo === selectedType;

      const matchesCategory =
        selectedCategory === "todas" ||
        transaction.categoria === selectedCategory;

      const matchesSearch =
        !normalizedSearch ||
        transaction.descricao.toLowerCase().includes(normalizedSearch) ||
        transaction.categoria.toLowerCase().includes(normalizedSearch);

      return matchesMonth && matchesType && matchesCategory && matchesSearch;
    });
  }, [
    searchTerm,
    selectedCategory,
    selectedMonth,
    selectedType,
    sortedTransactions,
  ]);

  const receitas = filteredTransactions
    .filter((transaction) => transaction.tipo === "receita")
    .reduce((total, transaction) => total + Number(transaction.valor), 0);

  const despesas = filteredTransactions
    .filter((transaction) => transaction.tipo === "despesa")
    .reduce((total, transaction) => total + Number(transaction.valor), 0);

  const saldo = receitas - despesas;

  const chartMaxValue = Math.max(receitas, despesas, 1);

  const receitasPercent = Math.round((receitas / chartMaxValue) * 100);
  const despesasPercent = Math.round((despesas / chartMaxValue) * 100);

  const expenseRatio = receitas > 0 ? (despesas / receitas) * 100 : 0;

  const biggestExpenseCategory = useMemo(() => {
    const categoryTotals = filteredTransactions
      .filter((transaction) => transaction.tipo === "despesa")
      .reduce((acc, transaction) => {
        const category = transaction.categoria || "Sem categoria";
        acc[category] = (acc[category] || 0) + Number(transaction.valor);
        return acc;
      }, {});

    const categories = Object.entries(categoryTotals).sort(
      ([, totalA], [, totalB]) => totalB - totalA
    );

    if (categories.length === 0) {
      return null;
    }

    const [category, total] = categories[0];

    return {
      category,
      total,
    };
  }, [filteredTransactions]);

  const categorySummary = useMemo(() => {
    const groupedCategories = filteredTransactions.reduce((acc, transaction) => {
      const category = transaction.categoria || "Sem categoria";

      if (!acc[category]) {
        acc[category] = {
          category,
          receitas: 0,
          despesas: 0,
          count: 0,
        };
      }

      if (transaction.tipo === "receita") {
        acc[category].receitas += Number(transaction.valor);
      }

      if (transaction.tipo === "despesa") {
        acc[category].despesas += Number(transaction.valor);
      }

      acc[category].count += 1;

      return acc;
    }, {});

    return Object.values(groupedCategories)
      .map((item) => ({
        ...item,
        saldo: item.receitas - item.despesas,
        movimentacao: item.receitas + item.despesas,
      }))
      .sort((a, b) => b.movimentacao - a.movimentacao);
  }, [filteredTransactions]);

  const budgetRows = useMemo(() => {
    const summaryByCategory = categorySummary.reduce((acc, item) => {
      acc[item.category] = item;
      return acc;
    }, {});

    return Object.entries(budgets)
      .map(([category, limit]) => {
        const summary = summaryByCategory[category];
        const spent = summary ? summary.despesas : 0;
        const remaining = Number(limit) - spent;
        const usedPercent = Number(limit) > 0 ? (spent / Number(limit)) * 100 : 0;

        return {
          category,
          limit: Number(limit),
          spent,
          remaining,
          usedPercent,
          status:
            usedPercent >= 100
              ? "estourado"
              : usedPercent >= 80
              ? "atenção"
              : "ok",
        };
      })
      .sort((a, b) => b.usedPercent - a.usedPercent);
  }, [budgets, categorySummary]);

  const financialDiagnosis = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return {
        status: "Sem dados",
        className: "neutral",
        message:
          "Cadastre receitas e despesas ou ajuste os filtros para gerar um diagnóstico financeiro.",
      };
    }

    if (receitas === 0 && despesas > 0) {
      return {
        status: "Atenção",
        className: "warning",
        message:
          "Existem despesas registradas, mas nenhuma receita dentro dos filtros selecionados.",
      };
    }

    if (saldo < 0) {
      return {
        status: "Crítico",
        className: "danger",
        message:
          "O resultado filtrado está com saldo negativo. Revise as maiores despesas e priorize entradas de receita.",
      };
    }

    if (expenseRatio >= 80) {
      return {
        status: "Atenção",
        className: "warning",
        message:
          "As despesas estão consumindo boa parte das receitas no recorte selecionado.",
      };
    }

    return {
      status: "Saudável",
      className: "success",
      message:
        "O recorte selecionado está com saldo positivo e despesas abaixo das receitas.",
    };
  }, [despesas, expenseRatio, filteredTransactions.length, receitas, saldo]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prevData) => {
      if (name === "tipo") {
        return {
          ...prevData,
          tipo: value,
          categoria: "",
        };
      }

      return {
        ...prevData,
        [name]: value,
      };
    });
  }

  function handleBudgetChange(event) {
    const { name, value } = event.target;

    setBudgetForm((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData({
      valor: "",
      data: getTodayDate(),
      descricao: "",
      categoria: "",
      tipo: "despesa",
    });

    setEditingTransactionId(null);
  }

  function clearFilters() {
    setSelectedMonth("todos");
    setSelectedType("todos");
    setSelectedCategory("todas");
    setSearchTerm("");
  }

  function handleBudgetSubmit(event) {
    event.preventDefault();

    if (!budgetForm.categoria || !budgetForm.limite) {
      alert("Informe a categoria e o limite do orçamento.");
      return;
    }

    const convertedLimit = Number(String(budgetForm.limite).replace(",", "."));

    if (Number.isNaN(convertedLimit) || convertedLimit <= 0) {
      alert("Informe um limite válido.");
      return;
    }

    setBudgets((prevBudgets) => ({
      ...prevBudgets,
      [budgetForm.categoria]: convertedLimit,
    }));

    setBudgetForm({
      categoria: "",
      limite: "",
    });
  }

  function handleDeleteBudget(category) {
    const confirmDelete = confirm(
      `Deseja remover o orçamento da categoria "${category}"?`
    );

    if (!confirmDelete) {
      return;
    }

    setBudgets((prevBudgets) => {
      const updatedBudgets = { ...prevBudgets };
      delete updatedBudgets[category];

      return updatedBudgets;
    });
  }

  function handleExportCsv() {
    if (filteredTransactions.length === 0) {
      alert("Não há transações para exportar.");
      return;
    }

    const header = ["ID", "Data", "Descrição", "Categoria", "Tipo", "Valor"];

    const rows = filteredTransactions.map((transaction) => [
      transaction.id,
      transaction.data,
      transaction.descricao,
      transaction.categoria,
      transaction.tipo,
      Number(transaction.valor).toFixed(2).replace(".", ","),
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCsvValue).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const monthPart =
      selectedMonth === "todos" ? "todos-os-meses" : selectedMonth;

    link.href = url;
    link.download = `transacoes-financeiras-${monthPart}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function handleEdit(transaction) {
    setEditingTransactionId(transaction.id);

    setFormData({
      valor: String(transaction.valor).replace(".", ","),
      data: transaction.data,
      descricao: transaction.descricao,
      categoria: transaction.categoria,
      tipo: transaction.tipo,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !formData.valor ||
      !formData.data ||
      !formData.descricao ||
      !formData.categoria
    ) {
      alert("Preencha todos os campos.");
      return;
    }

    const valorConvertido = Number(String(formData.valor).replace(",", "."));

    if (Number.isNaN(valorConvertido) || valorConvertido <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const transactionPayload = {
      valor: valorConvertido,
      data: formData.data,
      descricao: formData.descricao,
      categoria: formData.categoria,
      tipo: formData.tipo,
    };

    try {
      setSaving(true);

      const url = isEditing
        ? `${API_URL}/transactions/${editingTransactionId}`
        : `${API_URL}/transactions/`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro da API:", errorData);
        throw new Error(
          isEditing
            ? "Erro ao atualizar transação"
            : "Erro ao cadastrar transação"
        );
      }

      const savedTransaction = await response.json();

      if (isEditing) {
        setTransactions((prevTransactions) =>
          prevTransactions.map((transaction) =>
            transaction.id === editingTransactionId
              ? savedTransaction
              : transaction
          )
        );
      } else {
        setTransactions((prevTransactions) => [
          savedTransaction,
          ...prevTransactions,
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      alert(
        isEditing
          ? "Não foi possível atualizar a transação."
          : "Não foi possível cadastrar a transação."
      );
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

      setTransactions((prevTransactions) =>
        prevTransactions.filter((transaction) => transaction.id !== transactionId)
      );

      if (editingTransactionId === transactionId) {
        resetForm();
      }
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      alert("Não foi possível excluir a transação.");
    }
  }

  return (
    <main className="container">
      <section className="header">
        <div>
          <h1>Dashboard Financeiro</h1>
          <p>Gestão inicial do fluxo de caixa do escritório</p>
        </div>

        <div className="month-filter">
          <label>Mês de referência</label>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            <option value="todos">Todos os meses</option>

            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="filters-wrapper">
        <div className="filter-group search-filter">
          <label>Buscar</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Busque por descrição ou categoria"
          />
        </div>

        <div className="filter-group">
          <label>Tipo</label>
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Categoria</label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="todas">Todas</option>

            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button type="button" className="clear-filter-button" onClick={clearFilters}>
            Limpar filtros
          </button>

          <button type="button" className="export-button" onClick={handleExportCsv}>
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="cards">
        <div className="card">
          <span>Receitas</span>
          <strong>{formatCurrency(receitas)}</strong>
        </div>

        <div className="card">
          <span>Despesas</span>
          <strong>{formatCurrency(despesas)}</strong>
        </div>

        <div className="card saldo">
          <span>Saldo</span>
          <strong>{formatCurrency(saldo)}</strong>
        </div>
      </section>

      <section className="insights-grid">
        <div className={`diagnosis-card ${financialDiagnosis.className}`}>
          <span>Diagnóstico do período</span>
          <strong>{financialDiagnosis.status}</strong>
          <p>{financialDiagnosis.message}</p>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <span>Comparativo</span>
              <strong>Receitas x Despesas</strong>
            </div>

            <small>
              {selectedMonth === "todos"
                ? "Todos os meses"
                : formatMonthLabel(selectedMonth)}
            </small>
          </div>

          <div className="bar-chart">
            <div className="bar-row">
              <div className="bar-label">
                <span>Receitas</span>
                <strong>{formatCurrency(receitas)}</strong>
              </div>

              <div className="bar-track">
                <div
                  className="bar-fill revenue-bar"
                  style={{ width: `${receitasPercent}%` }}
                />
              </div>
            </div>

            <div className="bar-row">
              <div className="bar-label">
                <span>Despesas</span>
                <strong>{formatCurrency(despesas)}</strong>
              </div>

              <div className="bar-track">
                <div
                  className="bar-fill expense-bar"
                  style={{ width: `${despesasPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="indicator-card">
          <span>Despesas sobre receitas</span>
          <strong>{receitas > 0 ? `${expenseRatio.toFixed(1)}%` : "0%"}</strong>
          <p>
            {receitas > 0
              ? "Percentual das receitas comprometido por despesas."
              : "Cadastre receitas para calcular este indicador."}
          </p>
        </div>

        <div className="indicator-card">
          <span>Maior categoria de gasto</span>
          <strong>
            {biggestExpenseCategory
              ? biggestExpenseCategory.category
              : "Sem despesas"}
          </strong>
          <p>
            {biggestExpenseCategory
              ? `${formatCurrency(biggestExpenseCategory.total)} no período.`
              : "Nenhuma despesa registrada no filtro atual."}
          </p>
        </div>
      </section>

      <section className="budget-wrapper">
        <div className="budget-header">
          <div>
            <h2>Orçamento por categoria</h2>
            <p>
              Defina limites mensais para categorias e acompanhe quanto já foi consumido no filtro atual.
            </p>
          </div>

          <span className="transaction-count">
            {budgetRows.length} orçamento
            {budgetRows.length === 1 ? "" : "s"}
          </span>
        </div>

        <form className="budget-form" onSubmit={handleBudgetSubmit}>
          <div className="form-group">
            <label>Categoria</label>
            <input
              type="text"
              name="categoria"
              value={budgetForm.categoria}
              onChange={handleBudgetChange}
              list="budget-category-suggestions"
              placeholder="Ex: Operacional"
            />

            <datalist id="budget-category-suggestions">
              {budgetCategoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Limite mensal</label>
            <input
              type="text"
              name="limite"
              value={budgetForm.limite}
              onChange={handleBudgetChange}
              placeholder="Ex: 1000 ou 1000,50"
              inputMode="decimal"
            />
          </div>

          <button type="submit">Salvar orçamento</button>
        </form>

        {budgetRows.length === 0 ? (
          <p className="empty-budget-message">
            Nenhum orçamento definido ainda. Cadastre um limite para começar a acompanhar.
          </p>
        ) : (
          <div className="budget-list">
            {budgetRows.map((budget) => (
              <div className={`budget-item ${budget.status}`} key={budget.category}>
                <div className="budget-item-header">
                  <div>
                    <strong>{budget.category}</strong>
                    <span>
                      {formatCurrency(budget.spent)} usados de{" "}
                      {formatCurrency(budget.limit)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="remove-budget-button"
                    onClick={() => handleDeleteBudget(budget.category)}
                  >
                    Remover
                  </button>
                </div>

                <div className="budget-progress-track">
                  <div
                    className="budget-progress-fill"
                    style={{ width: `${Math.min(budget.usedPercent, 100)}%` }}
                  />
                </div>

                <div className="budget-footer">
                  <span>{budget.usedPercent.toFixed(1)}% utilizado</span>
                  <strong
                    className={
                      budget.remaining >= 0 ? "positive-value" : "negative-value"
                    }
                  >
                    {budget.remaining >= 0 ? "Restam " : "Excedeu "}
                    {formatCurrency(Math.abs(budget.remaining))}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="category-report">
        <div className="report-header">
          <div>
            <h2>Resumo por categoria</h2>
            <p>Consolidado das receitas, despesas e saldo por categoria.</p>
          </div>

          <span className="transaction-count">
            {categorySummary.length} categoria
            {categorySummary.length === 1 ? "" : "s"}
          </span>
        </div>

        {categorySummary.length === 0 ? (
          <p>Nenhuma categoria encontrada para os filtros selecionados.</p>
        ) : (
          <div className="category-list">
            {categorySummary.map((item) => (
              <div className="category-item" key={item.category}>
                <div>
                  <strong>{item.category}</strong>
                  <span>
                    {item.count} transação{item.count === 1 ? "" : "ões"}
                  </span>
                </div>

                <div className="category-values">
                  <span className="positive-value">
                    + {formatCurrency(item.receitas)}
                  </span>
                  <span className="negative-value">
                    - {formatCurrency(item.despesas)}
                  </span>
                  <strong
                    className={item.saldo >= 0 ? "positive-value" : "negative-value"}
                  >
                    {formatCurrency(item.saldo)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="form-wrapper">
        <div className="form-title-row">
          <div>
            <h2>{isEditing ? "Editar transação" : "Nova transação"}</h2>
            <p>
              {isEditing
                ? "Atualize os dados da transação selecionada."
                : "Cadastre uma nova receita ou despesa."}
            </p>
          </div>

          {isEditing && (
            <button type="button" className="secondary-button" onClick={resetForm}>
              Cancelar edição
            </button>
          )}
        </div>

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
              list="category-suggestions"
              placeholder={
                formData.tipo === "receita"
                  ? "Ex: Consultoria"
                  : "Ex: Operacional"
              }
            />

            <datalist id="category-suggestions">
              {categorySuggestionsForType.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Valor</label>
            <input
              type="text"
              name="valor"
              value={formData.valor}
              onChange={handleChange}
              placeholder="Ex: 500 ou 500,50"
              inputMode="decimal"
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
            {saving
              ? "Salvando..."
              : isEditing
              ? "Atualizar"
              : "Cadastrar"}
          </button>
        </form>
      </section>

      <section className="table-wrapper">
        <div className="table-header">
          <div>
            <h2>Transações</h2>
            <p>
              {selectedMonth === "todos"
                ? "Exibindo transações conforme os filtros selecionados."
                : `Exibindo transações de ${formatMonthLabel(selectedMonth)}.`}
            </p>
          </div>

          <span className="transaction-count">
            {filteredTransactions.length} transação
            {filteredTransactions.length === 1 ? "" : "ões"}
          </span>
        </div>

        {loading ? (
          <p>Carregando transações...</p>
        ) : filteredTransactions.length === 0 ? (
          <p>Nenhuma transação encontrada para os filtros selecionados.</p>
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
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={
                    editingTransactionId === transaction.id ? "editing-row" : ""
                  }
                >
                  <td>{transaction.data}</td>
                  <td>{transaction.descricao}</td>
                  <td>{transaction.categoria}</td>
                  <td>
                    <span className={`badge ${transaction.tipo}`}>
                      {transaction.tipo}
                    </span>
                  </td>
                  <td>{formatCurrency(Number(transaction.valor))}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(transaction)}
                      >
                        Editar
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        Excluir
                      </button>
                    </div>
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
