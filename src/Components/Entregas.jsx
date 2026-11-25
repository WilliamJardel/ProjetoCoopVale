import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import SidebarNavigation from "./SidebarNavigation";
import UserProfileButton from "./UserProfileButton";
import "../Styles/Dashboard.css";
import "../Styles/Entregas.css";
import {
  formatIntegerInput,
  parseIntegerInput,
} from "../utils/inputFormatters";

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

const emptyForm = () => ({
  contract_id: "",
  contract_item_id: "",
  solicited_quantity: "",
  delivered_qtd: "",
  delivery_date: today(),
  note: "",
  status: "Pendente",
});

const formatDate = (date) => {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const formatQuantity = (quantity) =>
  Number(quantity).toLocaleString("pt-BR");

function Entregas({ onNavigate }) {
  const [deliveries, setDeliveries] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [items, setItems] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [deliveryData, contractData, itemData, institutionData] =
        await Promise.all([
          invoke("list_deliveries"),
          invoke("list_contracts"),
          invoke("list_contract_items"),
          invoke("list_institutions"),
        ]);
      setDeliveries(deliveryData);
      setContracts(contractData);
      setItems(itemData);
      setInstitutions(institutionData);
    } catch (err) {
      console.error("Erro ao carregar entregas:", err);
      setError(`Não foi possível carregar as entregas: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const editableContracts = useMemo(
    () => new Map(contracts.filter((contract) => contract.status !== "Concluido").map((contract) => [contract.id, contract])),
    [contracts],
  );

  const availableItems = useMemo(
    () => items.filter((item) => {
      const contract = editableContracts.get(item.contract_id);
      const alreadyDelivered = editingId !== null && deliveries.find((delivery) => delivery.id === editingId)?.contract_item.id === item.id
        ? deliveries.find((delivery) => delivery.id === editingId).delivered_qtd
        : 0;
      return contract && item.item_qtd - item.delivered_qtd + alreadyDelivered > 0;
    }),
    [deliveries, editingId, editableContracts, items],
  );

  const selectedContractItems = useMemo(
    () => availableItems.filter((item) => item.contract_id === Number(form.contract_id)),
    [availableItems, form.contract_id],
  );

  const contractItemsForSelected = useMemo(
    () => items.filter((item) => item.contract_id === Number(form.contract_id)),
    [items, form.contract_id],
  );

  const visibleDeliveries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return deliveries.filter((delivery) => {
      const institution = institutions.find((entry) => entry.id === delivery.contract.institution_id);
      const searchable = [
        delivery.id,
        delivery.contract.id,
        institution?.name ?? "",
        delivery.contract_item.product.name,
        delivery.note,
      ].join(" ").toLocaleLowerCase("pt-BR");
      return (!statusFilter || delivery.status === statusFilter) && searchable.includes(query);
    });
  }, [deliveries, institutions, search, statusFilter]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const solicited = parseIntegerInput(form.solicited_quantity);
    const delivered = parseIntegerInput(form.delivered_qtd);
    const item = items.find((entry) => entry.id === Number(form.contract_item_id));
    if (item && item.contract_id !== Number(form.contract_id)) {
      setError("Selecione um item pertencente ao contrato escolhido.");
      return;
    }
    const current = editingId === null ? null : deliveries.find((delivery) => delivery.id === editingId);
    const remaining = item
      ? item.item_qtd - item.delivered_qtd + (current?.contract_item.id === item.id ? current.delivered_qtd : 0)
      : 0;

    if (!item || !Number.isInteger(solicited) || !Number.isInteger(delivered) ||
        solicited <= 0 || delivered <= 0 || delivered > solicited || solicited > remaining) {
      setError("Selecione um item e informe quantidades válidas dentro do saldo disponível.");
      return;
    }

    const data = {
      contract_item_id: item.id,
      solicited_quantity: solicited,
      delivered_qtd: delivered,
      delivery_date: form.delivery_date,
      note: form.note.trim(),
      status: form.status,
    };

    setSaving(true);
    try {
      if (editingId === null) {
        await invoke("create_delivery", { data });
        setSuccess("Entrega cadastrada com sucesso.");
      } else {
        await invoke("update_delivery", { id: editingId, data });
        setSuccess("Entrega atualizada com sucesso.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Erro ao salvar entrega:", err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (delivery) => {
    setError("");
    setSuccess("");
    setEditingId(delivery.id);
    setForm({
      contract_id: String(delivery.contract_item.contract_id ?? delivery.contract.id),
      contract_item_id: String(delivery.contract_item.id),
      solicited_quantity: formatIntegerInput(delivery.solicited_quantity),
      delivered_qtd: formatIntegerInput(delivery.delivered_qtd),
      delivery_date: delivery.delivery_date,
      note: delivery.note,
      status: delivery.status,
    });
  };

  const handleDelete = async (delivery) => {
    if (!window.confirm("Deseja realmente excluir esta entrega?")) return;
    setError("");
    setSuccess("");
    try {
      await invoke("delete_delivery", { id: delivery.id });
      setSuccess("Entrega excluída com sucesso.");
      if (editingId === delivery.id) resetForm();
      await loadData();
    } catch (err) {
      console.error("Erro ao excluir entrega:", err);
      setError(String(err));
    }
  };

  return (
    <div className="dashboard-container entregas-screen">
      <SidebarNavigation onNavigate={onNavigate} activeScreen="entregas" />

      <div className="main-wrapper">
        <main className="dashboard-content">
          <header className="dashboard-header">
            <div>
              <h1>Entregas</h1>
              <p>Registre e acompanhe as entregas dos itens de contrato.</p>
            </div>
            <UserProfileButton onClick={() => onNavigate?.("perfil")} />
          </header>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">{editingId === null ? "Cadastrar entrega" : "Editar entrega"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm font-medium xl:col-span-3">
                Contrato
                <select
                  required
                  value={form.contract_id}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    contract_id: event.target.value,
                    contract_item_id: "",
                  }))}
                  className="rounded-lg border border-gray-300 p-2.5 font-normal"
                >
                  <option value="">Selecione um contrato</option>
                  {[...editableContracts.values()].map((contract) => {
                    const institution = institutions.find((entry) => entry.id === contract.institution_id);
                    return (
                      <option key={contract.id} value={contract.id}>
                        Contrato #{contract.id} — {institution?.name ?? "Instituição"}
                      </option>
                    );
                  })}
                </select>
              </label>
              {form.contract_id && (
                <div className="xl:col-span-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-semibold">Itens solicitados pelo contrato</p>
                  {selectedContractItems.length === 0 ? (
                    <p className="text-sm text-gray-500">Todos os itens deste contrato já foram entregues.</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {contractItemsForSelected.map((item) => {
                        const current = editingId !== null
                          ? deliveries.find((delivery) => delivery.id === editingId)
                          : null;
                        const remaining = item.item_qtd - item.delivered_qtd
                          + (current?.contract_item.id === item.id ? current.delivered_qtd : 0);
                        return (
                          <div key={item.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-gray-600">
                              Quantidade contratada: {formatQuantity(item.item_qtd)} {item.product.measurement_unit}
                            </p>
                            <p className="text-gray-600">
                              Entregue: {formatQuantity(item.delivered_qtd)} {item.product.measurement_unit}
                            </p>
                            <p className="text-gray-600">
                              Restante: {formatQuantity(remaining)} {item.product.measurement_unit}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <label className="flex flex-col gap-1 text-sm font-medium xl:col-span-3">
                Item do contrato
                <select required disabled={!form.contract_id} value={form.contract_item_id} onChange={(event) => setForm((current) => ({ ...current, contract_item_id: event.target.value }))} className="rounded-lg border border-gray-300 p-2.5 font-normal disabled:bg-gray-100">
                  <option value="">Selecione um item do contrato</option>
                  {selectedContractItems.map((item) => {
                    const current = editingId === null ? null : deliveries.find((delivery) => delivery.id === editingId);
                    const remaining = item.item_qtd - item.delivered_qtd + (current?.contract_item.id === item.id ? current.delivered_qtd : 0);
                    return <option key={item.id} value={item.id}>{item.product.name} — contratada {formatQuantity(item.item_qtd)} — entregue {formatQuantity(item.delivered_qtd)} — restante {formatQuantity(remaining)} {item.product.measurement_unit}</option>;
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Quantidade solicitada
                <input type="text" inputMode="numeric" required value={form.solicited_quantity} onChange={(event) => setForm((current) => ({ ...current, solicited_quantity: formatIntegerInput(event.target.value) }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Quantidade entregue
                <input type="text" inputMode="numeric" required value={form.delivered_qtd} onChange={(event) => setForm((current) => ({ ...current, delivered_qtd: formatIntegerInput(event.target.value) }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Data da entrega
                <input type="date" required value={form.delivery_date} onChange={(event) => setForm((current) => ({ ...current, delivery_date: event.target.value }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Status
                <select required value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="rounded-lg border border-gray-300 p-2.5 font-normal">
                  <option value="Pendente">Pendente</option>
                  <option value="Entregue">Entregue</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium xl:col-span-2">
                Observação
                <input maxLength="500" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className="rounded-lg border border-gray-300 p-2.5 font-normal" />
              </label>
              <div className="flex gap-2 md:col-span-2 xl:col-span-3">
                {editingId !== null && <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2.5">Cancelar</button>}
                <button type="submit" disabled={saving || loading || availableItems.length === 0} className="rounded-lg bg-[#588e38] px-4 py-2.5 font-medium text-white disabled:opacity-60">
                  {saving ? "Salvando..." : editingId === null ? "Cadastrar entrega" : "Salvar alterações"}
                </button>
              </div>
            </form>
            {!loading && availableItems.length === 0 && <p className="mt-3 text-sm text-gray-500">Não há itens disponíveis em contratos ativos.</p>}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Entregas registradas ({visibleDeliveries.length})</h2>
              <div className="flex flex-wrap gap-2">
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contrato, produto ou instituição" className="rounded-lg border border-gray-300 p-2.5 text-sm" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-gray-300 p-2.5 text-sm">
                  <option value="">Todos os status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Entregue">Entregue</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr><th className="p-3">Entrega</th><th className="p-3">Data</th><th className="p-3">Contrato / Instituição</th><th className="p-3">Produto</th><th className="p-3">Quantidade</th><th className="p-3">Status</th><th className="p-3">Observação</th><th className="p-3">Ações</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="p-8 text-center text-gray-500">Carregando entregas...</td></tr>
                  ) : visibleDeliveries.length === 0 ? (
                    <tr><td colSpan="8" className="p-8 text-center text-gray-500">Nenhuma entrega encontrada.</td></tr>
                  ) : visibleDeliveries.map((delivery) => {
                    const institution = institutions.find((entry) => entry.id === delivery.contract.institution_id);
                    return (
                      <tr key={delivery.id} className="border-b border-gray-100">
                        <td className="p-3">#{delivery.id}</td>
                        <td className="p-3">{formatDate(delivery.delivery_date)}</td>
                        <td className="p-3">#{delivery.contract.id} · {institution?.name ?? "Instituição"}</td>
                        <td className="p-3">{delivery.contract_item.product.name}</td>
                        <td className="p-3">{formatQuantity(delivery.delivered_qtd)} / {formatQuantity(delivery.solicited_quantity)} {delivery.contract_item.product.measurement_unit}</td>
                        <td className="p-3">{delivery.status}</td>
                        <td className="p-3">{delivery.note || "—"}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleEdit(delivery)} className="rounded border px-2 py-1">Editar</button>
                            <button type="button" onClick={() => handleDelete(delivery)} className="rounded border border-red-200 px-2 py-1 text-red-700">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Entregas;
