import React, { useMemo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../Styles/Contratos.css";
import SidebarNavigation from "./SidebarNavigation";
import UserProfileButton from "./UserProfileButton";
import {
  formatCurrencyInput,
  parseCurrencyInput,
  formatIntegerInput,
  parseIntegerInput,
} from "../utils/inputFormatters";

const emptyForm = {
  contractNumber: "",
  institution_id: "",
  start_date: "",
  end_date: "",
  total_value: "",
  observations: "",
};

const isNearExpiration = (contract) => {
  if (contract.status === "Concluido") return false;
  const [year, month, day] = contract.end_date.split("-").map(Number);
  const endDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (endDate - today) / (1000 * 60 * 60 * 24) <= 30;
};

function Contratos({ onNavigate }) {
  const [institutions, setInstitutions] = useState([]);

  // Estado para controlar a visualização: 'list' (Listagem) ou 'create' (Formulário)
  const [viewMode, setViewMode] = useState("list");
  const [editingContractId, setEditingContractId] = useState(null);

  // Estados da Listagem
  const [contracts, setContracts] = useState([]);
  const [products, setProducts] = useState([]);
  const [contractItems, setContractItems] = useState([]);
  const [originalContractItems, setOriginalContractItems] = useState([]);
  const [itemForm, setItemForm] = useState({
    product_id: "",
    quantity: "",
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  // Estados do Formulário de Cadastro (conectados aos campos exigidos pelo backend)
  const [formData, setFormData] = useState(emptyForm);
  const [contractSuccessOpen, setContractSuccessOpen] = useState(false);

  // Lista dinâmica de produtos dentro do formulário de cadastro
  useEffect(() => {
    fetchContracts();
    fetchInstitutions();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const data = await invoke("list_products");
      setProducts(data || []);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      alert("Não foi possível carregar o catálogo de produtos: " + err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "total_value" ? formatCurrencyInput(value) : value,
    }));
  };

  const handleRemoveProduct = (id) => {
    const item = contractItems.find((entry) => entry.id === id);
    if (item?.delivered_qtd > 0) {
      alert("Este item já possui entregas e não pode ser removido.");
      return;
    }
    setContractItems((previous) => previous.filter((entry) => entry.id !== id));
  };

  const handleAddProduct = () => {
    const product = products.find((entry) => entry.id === Number(itemForm.product_id));
    const quantity = parseIntegerInput(itemForm.quantity);
    if (!product || product.status !== "Ativo" || !Number.isInteger(quantity) || quantity <= 0) {
      alert("Selecione um produto ativo e informe uma quantidade válida.");
      return;
    }
    setContractItems((previous) => [
      ...previous,
      {
        id: `new-${Date.now()}-${previous.length}`,
        product,
        item_qtd: quantity,
        delivered_qtd: 0,
        unit_price: product.reference_price_cents,
      },
    ]);
    setItemForm({ product_id: "", quantity: "" });
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    try {
      const totalValue = parseCurrencyInput(formData.total_value);
      const institutionId = Number(formData.institution_id);
      if (!Number.isFinite(totalValue) || totalValue <= 0) {
        throw new Error("Informe um valor de contrato maior que zero.");
      }
      if (!Number.isInteger(institutionId) || institutionId <= 0) {
        throw new Error("Selecione a instituição contratante.");
      }
      if (!formData.start_date || !formData.end_date) {
        throw new Error("Informe as datas de início e término do contrato.");
      }
      if (formData.end_date <= formData.start_date) {
        throw new Error("A data de término deve ser posterior à data de início.");
      }

      const payload = {
        contract_number: formData.contractNumber,
        institution_id: institutionId,
        total_value_cents: Math.round(totalValue * 100),
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      let savedContractId = editingContractId;
      if (editingContractId === null) {
        const savedContract = await invoke("create_contract", { data: payload });
        savedContractId = savedContract.id;
      } else {
        await invoke("update_contract", { id: editingContractId, data: payload });
      }

      const currentItemIds = new Set(
        contractItems
          .filter((item) => Number.isInteger(item.id))
          .map((item) => item.id),
      );
      for (const item of originalContractItems) {
        if (!currentItemIds.has(item.id) && item.delivered_qtd === 0) {
          await invoke("delete_contract_item", { id: item.id });
        }
      }
      for (const item of contractItems) {
        const itemData = {
          contract_id: savedContractId,
          product: item.product,
          item_qtd: Number(item.item_qtd),
          delivered_qtd: Number(item.delivered_qtd),
          unit_price: Number(item.unit_price),
        };
        if (Number.isInteger(item.id)) {
          await invoke("update_contract_item", { id: item.id, data: itemData });
        } else {
          await invoke("create_contract_item", { data: itemData });
        }
      }

      await fetchContracts();
      if (editingContractId === null) {
        setContractSuccessOpen(true);
      } else {
        alert("Contrato atualizado com sucesso!");
      }
      setFormData(emptyForm);
      setEditingContractId(null);
      setContractItems([]);
      setOriginalContractItems([]);
      setViewMode("list");
    } catch (err) {
      console.error("Erro ao salvar contrato:", err);
      alert("Erro ao salvar contrato: " + (err?.message || err));
    }
  };

  useEffect(() => {
    if (!contractSuccessOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setContractSuccessOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contractSuccessOpen]);

  const handleCreateContract = () => {
    setFormData(emptyForm);
    setEditingContractId(null);
    setContractItems([]);
    setOriginalContractItems([]);
    setItemForm({ product_id: "", quantity: "" });
    setViewMode("create");
  };

  const handleEditContract = async (contract) => {
    if (contract.status === "Concluido") {
      alert("Contratos concluídos não podem ser editados.");
      return;
    }

    try {
      const items = await invoke("list_contract_items_by_contract", {
        contractId: contract.id,
      });
      setContractItems(items);
      setOriginalContractItems(items);
    } catch (err) {
      console.error("Erro ao carregar itens do contrato:", err);
      alert("Não foi possível carregar os itens do contrato: " + err);
      return;
    }

    setFormData({
      ...emptyForm,
      contractNumber: contract.contract_number || "",
      institution_id: String(contract.institution_id),
      start_date: contract.start_date,
      end_date: contract.end_date,
      total_value: formatCurrencyInput(String(contract.total_value_cents)),
    });
    setEditingContractId(contract.id);
    setItemForm({ product_id: "", quantity: "" });
    setViewMode("create");
  };

  const filteredContracts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("pt-BR");
    const year = periodFilter ? Number(periodFilter) : null;

    return contracts.filter((contract) => {
      const institution = institutions.find(
        (item) => item.id === contract.institution_id,
      );
      const searchableText = [
        contract.contract_number,
        String(contract.id),
        institution?.name || `Instituição #${contract.institution_id}`,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      const matchesSearch = !query || searchableText.includes(query);
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "QuaseFinalizando"
          ? contract.status === "QuaseFinalizando" || isNearExpiration(contract)
          : contract.status === statusFilter);
      const matchesInstitution =
        !institutionFilter ||
        contract.institution_id === Number(institutionFilter);
      const matchesPeriod =
        year === null ||
        (Number(contract.start_date.slice(0, 4)) <= year &&
          Number(contract.end_date.slice(0, 4)) >= year);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesInstitution &&
        matchesPeriod
      );
    });
  }, [
    contracts,
    institutions,
    searchTerm,
    statusFilter,
    institutionFilter,
    periodFilter,
  ]);

  const contractYears = useMemo(() => {
    const years = new Set();
    contracts.forEach((contract) => {
      const startYear = Number(contract.start_date.slice(0, 4));
      const endYear = Number(contract.end_date.slice(0, 4));
      for (let year = startYear; year <= endYear; year += 1) {
        years.add(year);
      }
    });
    return [...years].sort((a, b) => a - b);
  }, [contracts]);

  const activeContractsCount = contracts.filter((item) => item.status !== "Concluido").length;
  const nearExpirationCount = contracts.filter(isNearExpiration).length;
  const completedContractsCount = contracts.filter((item) => item.status === "Concluido").length;

  // Formatação para exibição no resumo à direita
  const formattedValue = () => {
    const val = parseCurrencyInput(formData.total_value);
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

  const selectedProduct = products.find(
    (product) => product.id === Number(itemForm.product_id),
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="contracts-container">
      <SidebarNavigation
        onNavigate={onNavigate}
        activeScreen="contratos"
        activeAction={() => setViewMode("list")}
      />

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
                <UserProfileButton onClick={() => onNavigate?.("perfil")} />
                <button
                  type="button"
                  className="btn-add-contract"
                  onClick={handleCreateContract}
                >
                  <span className="plus-icon">+</span> Cadastrar contratos
                </button>
              </div>
            </header>

            <section className="contracts-metrics-grid">
              <div className="metric-card border-green">
                <div className="metric-icon-box">📄</div>
                <div className="metric-details">
                  <span className="metric-number">{activeContractsCount}</span>
                  <span className="metric-label">Contratos ativos</span>
                </div>
                <span className="arrow-icon">➔</span>
              </div>

              <div className="metric-card border-yellow">
                <div className="metric-icon-box yellow">📅</div>
                <div className="metric-details">
                  <span className="metric-number">{nearExpirationCount}</span>
                  <span className="metric-label">Próximos do vencimento</span>
                </div>
                <span className="arrow-icon">➔</span>
              </div>

              <div className="metric-card border-brown">
                <div className="metric-icon-box brown">🕒</div>
                <div className="metric-details">
                  <span className="metric-number">{completedContractsCount}</span>
                  <span className="metric-label">Concluídos</span>
                </div>
                <span className="arrow-icon">➔</span>
              </div>

              <div className="metric-card border-green-thick">
                <div className="metric-icon-box green-thick">📑</div>
                <div className="metric-details">
                  <span className="metric-number">
                    {contracts.length}
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
                <option value="Concluido">Finalizado</option>
              </select>

              <select
                className="filter-select"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
              >
                <option value="">Instituição</option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <option value="">Período</option>
                {contractYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
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
                    ) : filteredContracts.length > 0 ? (
                      filteredContracts.map((item) => (
                        <tr key={item.id}>
                          <td className="font-bold">{item.contract_number || "—"}</td>
                          <td>
                            {institutions.find(
                              (institution) => institution.id === item.institution_id,
                            )?.name || `Instituição #${item.institution_id}`}
                          </td>
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
                              onClick={() => handleEditContract(item)}
                              disabled={item.status === "Concluido"}
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="empty-state-cell">
                          {contracts.length
                            ? "Nenhum contrato corresponde aos filtros selecionados."
                            : "Nenhum contrato cadastrado no momento."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination-bar">
                <span className="pagination-info">
                  Mostrando {filteredContracts.length} de {contracts.length} contratos
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
                  onClick={() => {
                    setFormData(emptyForm);
                    setEditingContractId(null);
                    setViewMode("list");
                  }}
                >
                  ← Contratos / Chamadas
                </button>
                <h1>{editingContractId === null ? "Cadastrar contratos" : "Editar contrato"}</h1>
                <p>Gerencie os Contratos e Chamadas da Cooperativa</p>
              </div>

              <div className="header-actions-create">
                <div className="user-profile-top">
                  <div className="notification-bell">
                    <span className="bell-icon">🔔</span>
                    <span className="notification-badge">2</span>
                  </div>
                  <UserProfileButton onClick={() => onNavigate?.("perfil")} />
                </div>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setFormData(emptyForm);
                      setEditingContractId(null);
                      setViewMode("list");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-save-contract"
                    onClick={handleSaveContract}
                  >
                    💾 {editingContractId === null ? "Salvar contrato" : "Salvar alterações"}
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
                      required
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
                        required
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
                        type="text"
                        inputMode="decimal"
                        required
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
                        required
                        value={formData.end_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Itens vinculados ao contrato */}
                <div className="contract-products-section">
                  <div className="products-section-header">
                    <h3>Produtos do contrato</h3>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Produto</label>
                      <select value={itemForm.product_id} onChange={(event) => setItemForm((current) => ({ ...current, product_id: event.target.value }))}>
                        <option value="">Selecione um produto</option>
                        {products.filter((product) => product.status === "Ativo").map((product) => (
                          <option key={product.id} value={product.id}>{product.name} ({product.measurement_unit})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantidade</label>
                      <input type="text" inputMode="numeric" value={itemForm.quantity} onChange={(event) => setItemForm((current) => ({ ...current, quantity: formatIntegerInput(event.target.value) }))} />
                    </div>
                    <div className="form-group">
                      <label>Preço de referência (R$)</label>
                      <input
                        type="text"
                        value={selectedProduct ? formatCurrency(selectedProduct.reference_price_cents) : ""}
                        placeholder="Selecione um produto"
                        readOnly
                        aria-readonly="true"
                      />
                    </div>
                    <div className="form-group">
                      <button type="button" className="btn-add-product" onClick={handleAddProduct} disabled={!products.some((product) => product.status === "Ativo")}>
                        <span className="plus-icon">+</span> Adicionar produto
                      </button>
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Quantidade</th>
                          <th>Unidade</th>
                          <th>Preço unitário</th>
                          <th className="text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.product.name}</td>
                            <td>{Number(item.item_qtd).toLocaleString("pt-BR")}</td>
                            <td>{item.product.measurement_unit}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn-delete-row"
                                onClick={() => handleRemoveProduct(item.id)}
                                disabled={item.delivered_qtd > 0}
                                title="Remover produto"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                        {contractItems.length === 0 && (
                          <tr><td colSpan="5">Adicione ao menos um produto ao contrato.</td></tr>
                        )}
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
      {contractSuccessOpen && (
        <div
          className="contract-success-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setContractSuccessOpen(false);
          }}
        >
          <section
            className="contract-success-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contract-success-title"
          >
            <button
              type="button"
              className="contract-success-close"
              aria-label="Fechar confirmação"
              onClick={() => setContractSuccessOpen(false)}
            >
              ×
            </button>
            <div className="contract-success-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </div>
            <h2 id="contract-success-title">contrato salvo com sucesso</h2>
            <button
              type="button"
              className="contract-success-button"
              onClick={() => setContractSuccessOpen(false)}
              autoFocus
            >
              Fechar
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Contratos;
