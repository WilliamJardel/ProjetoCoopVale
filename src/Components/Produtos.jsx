import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/inputFormatters";
import { menuIcons } from "./Icons";
import iconCoopVale from "../public/img/iconCoopVale.png";

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
  const { session } = useAuth();
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

  const navigation = [
    ["dashboard", "Início"],
    ["contratos", "Contratos / Chamadas"],
    ["financeiro", "Financeiro"],
    ["instituicoes", "Instituições"],
    ["notas-fiscais", "Notas Fiscais"],
    ["produtos", "Produtos"],
    ["entregas", "Entregas"],
    ["relatorios", "Relatórios"],
  ];

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={iconCoopVale} alt="CoopVale" className="sidebar-logo" />
          <span className="sidebar-subbrand">ValeGestão</span>
        </div>
        <nav className="sidebar-nav">
          {navigation.map(([screen, label]) => {
            const Icon = menuIcons[screen];
            return (
              <button
                key={screen}
                type="button"
                className={`nav-item ${screen === "produtos" ? "active" : ""}`}
                onClick={() => onNavigate?.(screen)}
              >
                {Icon && <Icon size={19} strokeWidth={1.8} />}
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="main-wrapper">
        <main className="dashboard-content">
          <header className="dashboard-header">
            <h1>Produtos</h1>
            <p>Cadastre e mantenha o catálogo de produtos da cooperativa.</p>
            <p className="text-sm text-gray-500">{session?.name}</p>
          </header>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">
              {editingId === null ? "Cadastrar produto" : "Editar produto"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Nome
                <input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Categoria
                <input required maxLength={80} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Unidade de medida
                <input required maxLength={30} placeholder="Ex.: kg, unidade, litro" value={form.measurement_unit} onChange={(event) => setForm((current) => ({ ...current, measurement_unit: event.target.value }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Preço de referência (R$)
                <input required inputMode="decimal" value={form.reference_price} onChange={(event) => setForm((current) => ({ ...current, reference_price: formatCurrencyInput(event.target.value) }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" placeholder="0,00" />
              </label>
              <div className="flex gap-2 md:col-span-2 xl:col-span-4">
                {editingId !== null && <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2.5">Cancelar</button>}
                <button type="submit" disabled={saving} className="rounded-lg bg-[#588e38] px-4 py-2.5 font-medium text-white disabled:opacity-60">
                  {saving ? "Salvando..." : editingId === null ? "Cadastrar produto" : "Salvar alterações"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Catálogo ({filteredProducts.length})</h2>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto ou categoria" className="rounded-lg border border-gray-300 p-2.5 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Unidade</th><th className="p-3">Preço de referência</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">Carregando produtos...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nenhum produto encontrado.</td></tr>
                  ) : filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100">
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-3">{product.category}</td>
                      <td className="p-3">{product.measurement_unit}</td>
                      <td className="p-3">{formatCurrency(product.reference_price_cents)}</td>
                      <td className="p-3">{product.status === "Ativo" ? "Ativo" : "Desativado"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEdit(product)} className="rounded border px-2 py-1">Editar</button>
                          {product.status === "Ativo" && <button type="button" onClick={() => handleDeactivate(product)} className="rounded border border-red-200 px-2 py-1 text-red-700">Desativar</button>}
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
