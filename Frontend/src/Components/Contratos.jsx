import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../Styles/Contratos.css";
import { useAuth } from "../context/AuthContext";
import CadastrarInstituicao from "./CadastrarInstituicao";

function Contratos({ onNavigate }) {
  const [institutions, setInstitutions] = useState([]);

  const { session } = useAuth();

  // Estado para controlar a visualização: 'list' (Listagem) ou 'create' (Formulário)
  const [viewMode, setViewMode] = useState("list");

  // Estados da Listagem
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  // Estados do Formulário de Cadastro (conectados aos campos exigidos pelo backend)
  const [formData, setFormData] = useState({
    contractNumber: "",
    institution_id: "",
    start_date: "",
    end_date: "",
    total_value: "",
    observations: "",
  });

  // Lista dinâmica de produtos dentro do formulário de cadastro
  const [productsList, setProductsList] = useState([
    { id: 1, name: "Polpa de Fruta", flavor: "Goiaba", quantity: 200, unit: "1kg" },
    { id: 2, name: "Polpa de Fruta", flavor: "Goiaba", quantity: 200, unit: "1kg" },
    { id: 3, name: "Polpa de Fruta", flavor: "Goiaba", quantity: 200, unit: "1kg" },
    { id: 4, name: "Polpa de Fruta", flavor: "Goiaba", quantity: 200, unit: "1kg" },
    { id: 5, name: "Polpa de Fruta", flavor: "Goiaba", quantity: 200, unit: "1kg" },
  ]);

  useEffect(() => {
    fetchContracts();
    fetchInstitutions();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const data = await invoke("list_contracts");
      setContracts(data || []);
    } catch (err) {
      console.error("Erro ao carregar contratos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const data = await invoke("list_institutions");
      setInstitutions(data || []);
    } catch (err) {
      console.error("Erro ao carregar instituições:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRemoveProduct = (id) => {
    setProductsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddProduct = () => {
    const newProd = {
      id: Date.now(),
      name: "Polpa de Fruta",
      flavor: "Goiaba",
      quantity: 200,
      unit: "1kg",
    };
    setProductsList((prev) => [...prev, newProd]);
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    try {
      // Converte o valor em Reais digitado para centavos (conforme esperado pelo backend Rust)
      const cents = Math.round(parseFloat(formData.total_value || "0") * 100);

      const payload = {
        institution_id: parseInt(formData.institution_id || "1", 10),
        total_value_cents: cents,
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      await invoke("create_contract", { data: payload });
      alert("Contrato cadastrado com sucesso!");
      fetchContracts();
      setViewMode("list");
    } catch (err) {
      console.error("Erro ao salvar contrato:", err);
      alert("Erro ao salvar contrato: " + err);
    }
  };

  // Formatação para exibição no resumo à direita
  const formattedValue = () => {
    const val = parseFloat(formData.total_value || "0");
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "EmAndamento":
      case "Ativo":
        return <span className="status-badge badge-ativo">● Ativo</span>;
      case "QuaseFinalizando":
      case "ProximoLimite":
        return <span className="status-badge badge-limite">● Próx. do limite</span>;
      case "Encerrando":
        return <span className="status-badge badge-encerrando">● Encerrando</span>;
      case "Concluido":
      case "Finalizado":
        return <span className="status-badge badge-finalizado">● Finalizado</span>;
      default:
        return <span className="status-badge badge-ativo">{status || "Ativo"}</span>;
    }
  };

  const formatCurrency = (cents) => {
    if (cents === undefined || cents === null) return "R$ 0,00";
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="contracts-container">
      {/* Sidebar Lateral (Permanecendo fixa para navegação) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src="C:\Users\João Hélio\Documents\ProjetoCoopVale\ProjetoCoopVale\Frontend\src\public\img\iconCoopVale.png"
            alt="CoopVale Logo"
            className="sidebar-logo"
          />
          <span className="sidebar-subbrand">ValeGestão</span>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate && onNavigate("dashboard")}
          >
            <span className="nav-icon">🏠</span>
            <span>Início</span>
          </button>
          <button
            type="button"
            className="nav-item active"
            onClick={() => setViewMode("list")}
          >
            <span className="nav-icon">📑</span>
            <span>Contratos / Chamadas</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">💲</span>
            <span>Financeiro</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">🧾</span>
            <span>Notas Fiscais</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Relatórios</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">📦</span>
            <span>Produtos</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">🚚</span>
            <span>Entregas</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">🔔</span>
            <span>Avisos</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Configurações</span>
          </button>
        </nav>
      </aside>

      {/* Conteúdo Principal Alternável */}
      <div className="main-wrapper">
        {viewMode === "list" ? (
          /* ================= TELA DE LISTAGEM ================= */
          <main className="contracts-content">
            <header className="contracts-header">
              <div className="header-title">
                <h1>Contratos / Chamadas</h1>
                <p>Gerencie os Contratos e Chamadas da Cooperativa</p>
              </div>

              <div className="header-actions">
                <div className="notification-bell">
                  <span className="bell-icon">🔔</span>
                  <span className="notification-badge">2</span>
                </div>
                <div className="user-profile">
                  <div className="avatar">
                    {session?.name ? session.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="user-info">
                    <span className="user-name">
                      {session?.name || "Deusivan Vieira"}
                    </span>
                    <span className="user-role">Administrador</span>
                  </div>
                  <span className="dropdown-arrow">▼</span>
                </div>
                <button
                  type="button"
                  className="btn-add-contract"
                  onClick={() => setViewMode("create")}
                >
                  <span className="plus-icon">+</span> Cadastrar contratos
                </button>
              </div>
            </header>

            <section className="contracts-metrics-grid">
              <div className="metric-card border-green">
                <div className="metric-icon-box">📄</div>
                <div className="metric-details">
                  <span className="metric-number">{contracts.length || 8}</span>
                  <span className="metric-label">Contratos ativos</span>
                </div>
                <span className="arrow-icon">➔</span>
              </div>

              <div className="metric-card border-yellow">
                <div className="metric-icon-box yellow">📅</div>
                <div className="metric-details">
                  <span className="metric-number">2</span>
                  <span className="metric-label">Próximos do limite</span>
                </div>
                <span className="arrow-icon">➔</span>
              </div>

              <div className="metric-card border-brown">
                <div className="metric-icon-box brown">🕒</div>
                <div className="metric-details">
                  <span className="metric-number">1</span>
                  <span className="metric-label">Encerrando em 30 dias</span>
                </div>
                <span className="arrow-icon">➔</span>
              </div>

              <div className="metric-card border-green-thick">
                <div className="metric-icon-box green-thick">📑</div>
                <div className="metric-details">
                  <span className="metric-number">
                    {contracts.length || 13}
                  </span>
                  <span className="metric-label">Total de contratos</span>
                </div>
              </div>
            </section>

            <section className="filters-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar contrato ou instituição.."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Status</option>
                <option value="EmAndamento">Ativo</option>
                <option value="QuaseFinalizando">Próx. do limite</option>
                <option value="Encerrando">Encerrando</option>
                <option value="Concluido">Finalizado</option>
              </select>

              <select
                className="filter-select"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
              >
                <option value="">Instituição</option>
              </select>

              <select
                className="filter-select"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <option value="">Período</option>
              </select>
            </section>

            <section className="panel-card table-panel">
              <div className="panel-header">
                <h2>
                  <span className="panel-header-icon">📅</span> Entregas próximas
                </h2>
              </div>

              <div className="table-wrapper">
                <table className="contracts-table">
                  <thead>
                    <tr>
                      <th>Contrato</th>
                      <th>Instituição</th>
                      <th>Valor contratado</th>
                      <th>Período</th>
                      <th>Saldo</th>
                      <th>Status</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          Carregando contratos...
                        </td>
                      </tr>
                    ) : contracts.length > 0 ? (
                      contracts.map((item) => (
                        <tr key={item.id}>
                          <td className="font-bold">{`CP ${String(
                            item.id
                          ).padStart(2, "0")}/2026`}</td>
                          <td>{`Instituição #${item.institution_id}`}</td>
                          <td>{formatCurrency(item.total_value_cents)}</td>
                          <td>{`${formatDate(item.start_date)} - ${formatDate(
                            item.end_date
                          )}`}</td>
                          <td>{formatCurrency(item.total_value_cents)}</td>
                          <td>{renderStatusBadge(item.status)}</td>
                          <td className="text-center actions-cell">
                            <button
                              type="button"
                              className="action-btn"
                              title="Visualizar"
                            >
                              👁️
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              title="Editar"
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="empty-state-cell">
                          Nenhum contrato cadastrado no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination-bar">
                <span className="pagination-info">
                  Mostrando {contracts.length} contratos
                </span>
                <div className="pagination-controls">
                  <button type="button" className="page-btn active">
                    1
                  </button>
                  <button type="button" className="page-btn">
                    2
                  </button>
                  <button type="button" className="page-btn next">
                    ❯
                  </button>
                </div>
              </div>
            </section>
          </main>
        ) : (
          /* ================= TELA DE CADASTRO (Sub-tela) ================= */
          <main className="contracts-content">
            <header className="contracts-header">
              <div className="header-title">
                <button
                  type="button"
                  className="btn-back"
                  onClick={() => setViewMode("list")}
                >
                  ← Contratos / Chamadas
                </button>
                <h1>Cadastrar contratos</h1>
                <p>Gerencie os Contratos e Chamadas da Cooperativa</p>
              </div>

              <div className="header-actions-create">
                <div className="user-profile-top">
                  <div className="notification-bell">
                    <span className="bell-icon">🔔</span>
                    <span className="notification-badge">2</span>
                  </div>
                  <div className="user-profile">
                    <div className="avatar">
                      {session?.name
                        ? session.name.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                    <div className="user-info">
                      <span className="user-name">
                        {session?.name || "Deusivan Vieira"}
                      </span>
                      <span className="user-role">Administrador</span>
                    </div>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                </div>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setViewMode("list")}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-save-contract"
                    onClick={handleSaveContract}
                  >
                    💾 Salvar contrato
                  </button>
                </div>
              </div>
            </header>

            {/* Layout de Formulário em Duas Colunas */}
            <div className="create-contract-grid">
              {/* Coluna Principal do Formulário */}
              <div className="form-card-main">
                <div className="form-card-header">
                  <span className="icon">📄</span>
                  <h2>Dados do contrato</h2>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Número do contrato</label>
                    <input
                      type="text"
                      name="contractNumber"
                      placeholder="Ex: CP 09/2026"
                      value={formData.contractNumber}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Instituição / Órgão</label>
                    <select
                      name="institution_id"
                      value={formData.institution_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Selecione a instituição</option>
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Data de início</label>
                    <div className="input-with-icon">
                      <span className="input-icon">📅</span>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Valor do contrato</label>
                    <div className="input-currency-group">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        name="total_value"
                        placeholder="Ex: 15.850,00"
                        value={formData.total_value}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Data de término</label>
                    <div className="input-with-icon">
                      <span className="input-icon">📅</span>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Tabela Interna de Produtos */}
                <div className="contract-products-section">
                  <div className="products-section-header">
                    <h3>Produtos do contrato</h3>
                    <button
                      type="button"
                      className="btn-add-product"
                      onClick={handleAddProduct}
                    >
                      <span className="plus-icon">+</span> Adicionar produto
                    </button>
                  </div>

                  <div className="table-wrapper">
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Sabor</th>
                          <th>Quantidade</th>
                          <th>Unidade</th>
                          <th className="text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsList.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.flavor}</td>
                            <td>{item.quantity}</td>
                            <td>{item.unit}</td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn-delete-row"
                                onClick={() => handleRemoveProduct(item.id)}
                                title="Remover produto"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Campo de Observações */}
                <div className="form-group full-width margin-top-20">
                  <label>Observações</label>
                  <textarea
                    name="observations"
                    rows="4"
                    placeholder="Adicione observações (opcional)"
                    value={formData.observations}
                    onChange={handleInputChange}
                    maxLength={500}
                  ></textarea>
                  <span className="char-count">
                    {formData.observations.length}/500
                  </span>
                </div>
              </div>

              {/* Painel Lateral com Resumo dos Valores */}
              <div className="summary-card-sidebar">
                <div className="summary-header">
                  <span className="icon">📄</span>
                  <h3>Dados do contrato</h3>
                </div>

                <div className="summary-metric">
                  <span className="summary-label">Valor contratado</span>
                  <div className="summary-amount">{formattedValue()}</div>
                </div>

                <div className="summary-metric">
                  <span className="summary-label">Saldo inicial</span>
                  <div className="summary-amount">{formattedValue()}</div>
                </div>

                <div className="info-box-alert">
                  <span className="info-icon">ℹ️</span>
                  <p>
                    Após o cadastro, o contrato ficará disponível na lista de
                    Contratos / Chamadas.
                  </p>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Rodapé da Página */}
        <footer className="footer-bar">
          <div>© 2026 CoopVale. Todos os direitos reservados.</div>
          <div>
            CoopVale - Cooperativa dos Agricultores Familiares do Vale do
            Forquilha
          </div>
          <div>Versão 1.0.0</div>
        </footer>
      </div>
    </div>
  );
}

export default Contratos;