import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/inputFormatters";
import SidebarNavigation from "./SidebarNavigation";
import UserProfileButton from "./UserProfileButton";
import "../Styles/Dashboard.css";
import "../Styles/Produtos.css";

const emptyForm = {
  name: "",
  measurement_unit: "",
  category: "",
  reference_price: "",
};

const formatCurrency = (cents) =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function Produtos({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await invoke("list_products"));
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      setError(`Não foi possível carregar os produtos: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) =>
      [product.name, product.category, product.measurement_unit]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(query),
    );
  }, [products, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const price = parseCurrencyInput(form.reference_price);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Informe um preço de referência maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        measurement_unit: form.measurement_unit.trim(),
        category: form.category.trim(),
        reference_price_cents: Math.round(price * 100),
      };
      if (editingId === null) {
        await invoke("create_product", { data });
        setSuccess("Produto cadastrado com sucesso.");
      } else {
        await invoke("update_product", { id: editingId, data });
        setSuccess("Produto atualizado com sucesso.");
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setError("");
    setSuccess("");
    setEditingId(product.id);
    setForm({
      name: product.name,
      measurement_unit: product.measurement_unit,
      category: product.category,
      reference_price: formatCurrencyInput(String(product.reference_price_cents)),
    });
  };

  const handleDeactivate = async (product) => {
    if (!window.confirm(`Deseja desativar o produto "${product.name}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await invoke("deactivate_product", { id: product.id });
      setSuccess("Produto desativado com sucesso.");
      if (editingId === product.id) resetForm();
      await loadProducts();
    } catch (err) {
      console.error("Erro ao desativar produto:", err);
      setError(String(err));
    }
  };

  return (
    <div className="dashboard-container products-screen">
      <SidebarNavigation onNavigate={onNavigate} activeScreen="produtos" />

      <div className="main-wrapper">
        <main className="dashboard-content">
          <header className="dashboard-header">
            <div className="products-header-copy">
              <h1>Produtos</h1>
              <p>Cadastre e mantenha o catálogo de produtos da cooperativa.</p>
            </div>
            <UserProfileButton onClick={() => onNavigate?.("perfil")} />
          </header>

          {error && <div role="alert" className="products-notice error">{error}</div>}
          {success && <div role="status" className="products-notice success">{success}</div>}

          <section className="products-panel">
            <h2 className="products-section-title">
              {editingId === null ? "Cadastrar produto" : "Editar produto"}
            </h2>
            <form onSubmit={handleSubmit} className="products-form">
              <label>
                Nome
                <input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Categoria
                <input required maxLength={80} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
              </label>
              <label>
                Unidade de medida
                <input required maxLength={30} placeholder="Ex.: kg, unidade, litro" value={form.measurement_unit} onChange={(event) => setForm((current) => ({ ...current, measurement_unit: event.target.value }))} />
              </label>
              <label>
                Preço de referência (R$)
                <input required inputMode="decimal" value={form.reference_price} onChange={(event) => setForm((current) => ({ ...current, reference_price: formatCurrencyInput(event.target.value) }))} placeholder="0,00" />
              </label>
              <div className="products-form-actions">
                {editingId !== null && <button type="button" onClick={resetForm} className="products-button secondary">Cancelar</button>}
                <button type="submit" disabled={saving} className="products-button primary">
                  {saving ? "Salvando..." : editingId === null ? "Cadastrar produto" : "Salvar alterações"}
                </button>
              </div>
            </form>
          </section>

          <section className="products-panel">
            <div className="products-catalog-header">
              <h2 className="products-section-title">Catálogo ({filteredProducts.length})</h2>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto ou categoria" />
            </div>
            <div className="products-table-scroll">
              <table className="products-catalog-table">
                <thead>
                  <tr><th>Produto</th><th>Categoria</th><th>Unidade</th><th>Preço de referência</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="products-table-empty">Carregando produtos...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan="6" className="products-table-empty">Nenhum produto encontrado.</td></tr>
                  ) : filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="product-name-cell">{product.name}</td>
                      <td>{product.category}</td>
                      <td>{product.measurement_unit}</td>
                      <td>{formatCurrency(product.reference_price_cents)}</td>
                      <td><span className={`product-status ${product.status === "Ativo" ? "active" : "inactive"}`}>{product.status === "Ativo" ? "Ativo" : "Desativado"}</span></td>
                      <td>
                        <div className="products-row-actions">
                          <button type="button" onClick={() => handleEdit(product)} className="products-button small secondary">Editar</button>
                          {product.status === "Ativo" && <button type="button" onClick={() => handleDeactivate(product)} className="products-button small danger">Desativar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Produtos;
