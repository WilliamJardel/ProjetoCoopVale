import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../Styles/Dashboard.css";
import "../Styles/Contratos.css";
import "../Styles/Produtos.css";
import { useAuth } from "../context/AuthContext";
import iconCoopVale from "../public/img/iconCoopVale.png";

const emptyForm = {
  name: "",
  category: "",
  measurement_unit: "",
  reference_price: "",
};

const formatCurrency = (cents) =>
  ((cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// Aceita "12,50", "12.50" ou "1.250,50" e devolve centavos (inteiro)
const parsePriceToCents = (value) => {
  let text = String(value || "").trim().replace(/[R$\s]/g, "");
  if (!text) return 0;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  const number = Number(text);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
};

const errorText = (err) => (typeof err === "string" ? err : err?.message || String(err));

function Produtos({ onNavigate }) {
  const { session } = useAuth();

  const [products, setProducts] = useState([]);
  const [contractItems, setContractItems] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text }

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modais: 'form' (cadastro/edição), 'details' (visualização) e 'deactivate' (confirmação)
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [productList, items, contractList] = await Promise.all([
        invoke("list_products"),
        invoke("list_contract_items").catch(() => []),
        invoke("list_contracts").catch(() => []),
      ]);
      setProducts(productList || []);
      setContractItems(items || []);
      setContracts(contractList || []);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      setFeedback({ type: "error", text: "Erro ao carregar produtos: " + errorText(err) });
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Contratos vinculados a cada produto (via itens de contrato)
  const linkedContractsByProduct = useMemo(() => {
    const map = {};
    contractItems.forEach((item) => {
      const productId = item.product?.id;
      if (productId === undefined || item.contract_id == null) return;
      if (!map[productId]) map[productId] = new Set();
      map[productId].add(item.contract_id);
    });
    return map;
  }, [contractItems]);

  const contractLabel = (id) => {
    const found = contracts.find((c) => c.id === id);
    return `CP ${String(id).padStart(2, "0")}/${
      found?.start_date ? found.start_date.slice(0, 4) : "2026"
    }`;
  };

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setEditingId(null);
    setFormError("");
  };

  const openCreate = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setFormError("");
    setModal("form");
  };

  const openEdit = (product) => {
    setFormData({
      name: product.name,
      category: product.category,
      measurement_unit: product.measurement_unit,
      reference_price: (product.reference_price_cents / 100).toFixed(2).replace(".", ","),
    });
    setEditingId(product.id);
    setFormError("");
    setModal("form");
  };

  const openDetails = async (product) => {
    setSelected(product);
    setModal("details");
    try {
      const fresh = await invoke("get_product", { id: product.id });
      if (fresh) setSelected(fresh);
    } catch (err) {
      console.error("Erro ao buscar produto:", err);
    }
  };

  const openDeactivate = (product) => {
    setSelected(product);
    setModal("deactivate");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    const data = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      measurement_unit: formData.measurement_unit.trim(),
      reference_price_cents: parsePriceToCents(formData.reference_price),
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        await invoke("update_product", { id: editingId, data });
        showFeedback("success", "Produto atualizado com sucesso!");
      } else {
        await invoke("create_product", { data });
        showFeedback("success", "Produto cadastrado com sucesso!");
      }
      closeModal();
      await loadAll();
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await invoke("deactivate_product", { id: selected.id });
      showFeedback("success", `Produto "${selected.name}" desativado com sucesso!`);
      closeModal();
      await loadAll();
    } catch (err) {
      showFeedback("error", errorText(err));
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const renderStatusBadge = (status) =>
    status === "Ativo" ? (
      <span className="status-badge badge-ativo">● Ativo</span>
    ) : (
      <span className="status-badge badge-finalizado">● Desativado</span>
    );

  const renderLinkBadge = (productId) => {
    const count = linkedContractsByProduct[productId]?.size || 0;
    return count > 0 ? (
      <span className="status-badge badge-ativo">
        {count} {count === 1 ? "contrato" : "contratos"}
      </span>
    ) : (
      <span className="status-badge badge-finalizado">Sem vínculo</span>
    );
  };

  return (
    <div className="contracts-container">
      {/* Sidebar Lateral */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={iconCoopVale} alt="CoopVale Logo" className="sidebar-logo" />
          <span className="sidebar-subbrand">ValeGestão</span>
        </div>

        <nav className="sidebar-nav">
          <button type="button" className="nav-item" onClick={() => onNavigate && onNavigate("dashboard")}>
            <span className="nav-icon">🏠</span>
            <span>Início</span>
          </button>
          <button type="button" className="nav-item" onClick={() => onNavigate && onNavigate("contratos")}>
            <span className="nav-icon">📑</span>
            <span>Contratos / Chamadas</span>
          </button>
          <button type="button" className="nav-item" onClick={() => onNavigate && onNavigate("financeiro")}>
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
          <button type="button" className="nav-item active" onClick={() => onNavigate && onNavigate("produtos")}>
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

      <div className="main-wrapper">
        <main className="contracts-content">
          <header className="contracts-header">
            <div className="header-title">
              <h1>Produtos</h1>
              <p>Catálogo de produtos cadastrados na cooperativa</p>
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
                  <span className="user-name">{session?.name || "Deusivan Vieira"}</span>
                  <span className="user-role">Administrador</span>
                </div>
                <span className="dropdown-arrow">▼</span>
              </div>
              <button type="button" className="btn-add-contract" onClick={openCreate}>
                <span className="plus-icon">+</span> Cadastrar Produto
              </button>
            </div>
          </header>

          {feedback && (
            <div className={`products-feedback ${feedback.type}`} role="status">
              {feedback.text}
            </div>
          )}

          <section className="filters-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar produto por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </section>

          <section className="panel-card table-panel">
            <div className="table-wrapper">
              <table className="contracts-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th>Preço de referência</th>
                    <th>Sabores / variedades</th>
                    <th>Status</th>
                    <th>Vínculo</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        Carregando produtos...
                      </td>
                    </tr>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="font-bold">{product.name}</td>
                        <td>{product.category}</td>
                        <td>{product.measurement_unit}</td>
                        <td>{formatCurrency(product.reference_price_cents)}</td>
                        <td>—</td>
                        <td>{renderStatusBadge(product.status)}</td>
                        <td>{renderLinkBadge(product.id)}</td>
                        <td className="text-center actions-cell">
                          <button
                            type="button"
                            className="action-btn"
                            title="Visualizar"
                            onClick={() => openDetails(product)}
                          >
                            👁️
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            title="Editar"
                            onClick={() => openEdit(product)}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            title={
                              product.status === "Ativo"
                                ? "Desativar"
                                : "Produto já desativado"
                            }
                            disabled={product.status !== "Ativo"}
                            onClick={() => openDeactivate(product)}
                          >
                            🚫
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="empty-state-cell">
                        {products.length === 0
                          ? "Nenhum produto cadastrado no momento."
                          : "Nenhum produto encontrado para os filtros informados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-pagination-bar">
              <span className="pagination-info">
                Mostrando {filteredProducts.length} de {products.length} produtos
              </span>
            </div>
          </section>
        </main>

        {/* Modal de cadastro / edição */}
        {modal === "form" && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingId !== null ? "Editar produto" : "Cadastrar produto"}</h2>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Fechar">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body form-grid-2">
                  <div className="form-group full-width">
                    <label>Nome do produto</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ex: Polpa de Fruta"
                      value={formData.name}
                      onChange={handleInputChange}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Categoria</label>
                    <input
                      type="text"
                      name="category"
                      list="product-categories"
                      placeholder="Ex: Polpas"
                      value={formData.category}
                      onChange={handleInputChange}
                    />
                    <datalist id="product-categories">
                      {categories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label>Unidade de medida</label>
                    <input
                      type="text"
                      name="measurement_unit"
                      placeholder="Ex: 1kg"
                      value={formData.measurement_unit}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Preço de referência</label>
                    <div className="input-currency-group">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="reference_price"
                        placeholder="Ex: 12,50"
                        value={formData.reference_price}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {formError && <div className="products-feedback error modal-error">{formError}</div>}

                <div className="modal-footer">
                  <button type="button" className="btn-cancel" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save-contract" disabled={saving}>
                    {saving ? "Salvando..." : editingId !== null ? "💾 Salvar alterações" : "💾 Salvar produto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de detalhes */}
        {modal === "details" && selected && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Detalhes do produto</h2>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Fechar">
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <h3 className="details-product-name">{selected.name}</h3>
                <dl className="details-list">
                  <div>
                    <dt>Categoria</dt>
                    <dd>{selected.category}</dd>
                  </div>
                  <div>
                    <dt>Unidade de medida</dt>
                    <dd>{selected.measurement_unit}</dd>
                  </div>
                  <div>
                    <dt>Preço de referência</dt>
                    <dd>{formatCurrency(selected.reference_price_cents)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{renderStatusBadge(selected.status)}</dd>
                  </div>
                  <div>
                    <dt>Sabores disponíveis</dt>
                    <dd>—</dd>
                  </div>
                  <div>
                    <dt>Contratos vinculados</dt>
                    <dd>
                      {linkedContractsByProduct[selected.id]?.size ? (
                        <div className="chips">
                          {[...linkedContractsByProduct[selected.id]].map((id) => (
                            <span key={id} className="chip">
                              {contractLabel(id)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "Nenhum contrato vinculado"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmação de desativação */}
        {modal === "deactivate" && selected && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card modal-small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Desativar produto</h2>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Fechar">
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Deseja realmente desativar o produto <strong>{selected.name}</strong>? Esta ação
                  não pode ser desfeita por esta tela.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="button" className="btn-danger" onClick={handleDeactivate} disabled={saving}>
                  {saving ? "Desativando..." : "Desativar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="footer-bar">
          <div>© 2026 CoopVale. Todos os direitos reservados.</div>
          <div>CoopVale - Cooperativa dos Agricultores Familiares do Vale do Forquilha</div>
          <div>Versão 1.0.0</div>
        </footer>
      </div>
    </div>
  );
}

export default Produtos;