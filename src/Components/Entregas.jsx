import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../context/AuthContext";
import iconCoopVale from "../public/img/iconCoopVale.png";
import "../Styles/Entregas.css";

const localToday = () => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`; };
const emptyForm = { contract_item_id: "", solicited_quantity: "", delivered_qtd: "", delivery_date: localToday(), note: "", status: "Pendente" };
const dateLabel = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR") : "—";
const contractLabel = (id) => `CP ${String(id).padStart(2, "0")}/2026`;

function Entregas({ onNavigate }) {
  const { session } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [period, setPeriod] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [deliveryRows, institutionRows, contractRows, itemRows] = await Promise.all([
        invoke("list_deliveries"), invoke("list_institutions"), invoke("list_contracts"), invoke("list_contract_items"),
      ]);
      setDeliveries(deliveryRows || []);
      setInstitutions(institutionRows || []);
      setContracts(contractRows || []);
      setItems(itemRows || []);
    } catch (err) {
      setError(`Não foi possível carregar as entregas: ${err}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const institutionById = useMemo(() => new Map(institutions.map((row) => [row.id, row.name])), [institutions]);
  const activeItems = useMemo(() => items.filter((item) => {
    const contract = contracts.find((row) => row.id === item.contract_id);
    return contract && contract.status !== "Concluido" && item.item_qtd > item.delivered_qtd;
  }), [items, contracts]);
  const selectedItem = items.find((item) => item.id === Number(form.contract_item_id));
  const editingItem = editing && items.find((item) => item.id === editing.contract_item.id);
  const availableItems = editing && editingItem && !activeItems.some((item) => item.id === editingItem.id)
    ? [...activeItems, editingItem] : activeItems;

  const beginCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setView("form"); };
  const beginEdit = (delivery) => {
    setEditing(delivery);
    setForm({ contract_item_id: String(delivery.contract_item.id), solicited_quantity: String(delivery.solicited_quantity), delivered_qtd: String(delivery.delivered_qtd), delivery_date: delivery.delivery_date, note: delivery.note || "", status: delivery.status });
    setError(""); setView("form");
  };
  const change = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    const payload = { contract_item_id: Number(form.contract_item_id), solicited_quantity: Number(form.solicited_quantity), delivered_qtd: Number(form.delivered_qtd), delivery_date: form.delivery_date, note: form.note.trim(), status: form.status };
    try {
      if (editing) await invoke("update_delivery", { id: editing.id, data: payload });
      else await invoke("create_delivery", { data: payload });
      await load(); setView("list");
    } catch (err) { setError(String(err)); }
    finally { setSaving(false); }
  };

  const filtered = useMemo(() => deliveries.filter((row) => {
    const institution = institutionById.get(row.contract.institution_id) || `Instituição #${row.contract.institution_id}`;
    const query = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !query || [String(row.id), contractLabel(row.contract.id), row.contract_item.product.name, institution].some((part) => part.toLocaleLowerCase("pt-BR").includes(query));
    const matchesStatus = !statusFilter || row.status === statusFilter;
    const matchesInstitution = !institutionFilter || String(row.contract.institution_id) === institutionFilter;
    const matchesPeriod = !period || row.delivery_date?.startsWith(period);
    return matchesSearch && matchesStatus && matchesInstitution && matchesPeriod;
  }), [deliveries, institutionById, search, statusFilter, institutionFilter, period]);

  const completed = deliveries.filter((row) => row.status === "Entregue").length;
  const productCount = new Set(deliveries.map((row) => row.contract_item.product.id)).size;
  const contractCount = new Set(deliveries.map((row) => row.contract.id)).size;
  const formContract = selectedItem?.contract_id;
  const formInstitution = formContract && contracts.find((row) => row.id === formContract)?.institution_id;

  return <div className="deliveries-container">
    <aside className="sidebar">
      <div className="sidebar-brand"><img src={iconCoopVale} alt="CoopVale Logo" className="sidebar-logo" /><span className="sidebar-subbrand">ValeGestão</span></div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {[["🏠", "Início", "dashboard"], ["📑", "Contratos / Chamadas", "contratos"], ["💲", "Financeiro", "financeiro"], ["🧾", "Notas Fiscais"], ["📊", "Relatórios"], ["📦", "Produtos", "produtos"], ["🚚", "Entregas", "entregas"], ["🔔", "Avisos"], ["⚙️", "Configurações"]].map(([icon, label, route]) => <button type="button" key={label} className={`nav-item ${route === "entregas" ? "active" : ""}`} onClick={() => route && onNavigate?.(route)}><span className="nav-icon">{icon}</span><span>{label}</span></button>)}
      </nav>
      <div className="delivery-user"><span className="delivery-avatar">{session?.name?.[0]?.toUpperCase() || "U"}</span><span>{session?.name || "Usuário"}<small>Administrador</small></span></div>
    </aside>
    <div className="delivery-main">
      <header className="delivery-topbar"><span>CoopVale <b>/</b> Operação / Logística <b>/</b> Entregas</span><span className="delivery-top-user">🔔　{session?.name || "Usuário"}</span></header>
      <main className="delivery-content">
        {view === "list" ? <>
          <header className="delivery-heading"><div><span className="delivery-eyebrow">OPERAÇÃO / LOGÍSTICA</span><h1>Entregas</h1><p>Gerencie as entregas da cooperativa</p></div><button className="delivery-primary" onClick={beginCreate}>＋ Cadastrar entrega</button></header>
          {error && <div className="delivery-alert">{error}</div>}
          <section className="delivery-summary">
            <article><i className="sage">🚚</i><div><small>Total de entregas</small><strong>{deliveries.length}</strong><span>Entregas registradas</span></div></article>
            <article><i className="gold">📦</i><div><small>Produtos entregues</small><strong>{productCount}</strong><span>Produtos diferentes</span></div></article>
            <article><i className="lilac">📄</i><div><small>Contratos atendidos</small><strong>{contractCount}</strong><span>Contratos com entregas</span></div></article>
            <article><i className="blue">✓</i><div><small>Entregas concluídas</small><strong>{completed}</strong><span>Entregas confirmadas</span></div></article>
          </section>
          <section className="delivery-filters"><label>Buscar<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por número, contrato, produto ou instituição" /></label><label>Período<input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label><label>Instituição / Órgão<select value={institutionFilter} onChange={(e) => setInstitutionFilter(e.target.value)}><option value="">Todas</option>{institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select></label><label>Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Todos</option><option>Pendente</option><option>Entregue</option></select></label><button className="delivery-filter-reset" onClick={() => { setSearch(""); setPeriod(""); setInstitutionFilter(""); setStatusFilter(""); }}>Limpar filtros</button></section>
          <section className="delivery-table-card"><div className="delivery-table-heading"><h2>▦　Entregas realizadas</h2><span>{filtered.length} registro(s)</span></div><div className="delivery-table-scroll"><table><thead><tr><th>Número</th><th>Data de entrega</th><th>Contrato</th><th>Instituição</th><th>Produto(s)</th><th>Quantidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {loading ? <tr><td colSpan="8" className="delivery-empty">Carregando entregas...</td></tr> : filtered.length ? filtered.map((row) => <tr key={row.id}><td className="delivery-number">EN {String(row.id).padStart(6, "0")}</td><td>{dateLabel(row.delivery_date)}</td><td>{contractLabel(row.contract.id)}</td><td>{institutionById.get(row.contract.institution_id) || `Instituição #${row.contract.institution_id}`}</td><td>{row.contract_item.product.name}</td><td>{row.delivered_qtd} {row.contract_item.product.measurement_unit}</td><td><span className={`delivery-status ${row.status === "Entregue" ? "done" : "pending"}`}>{row.status}</span></td><td><button className="delivery-edit" onClick={() => beginEdit(row)} aria-label={`Atualizar entrega ${row.id}`} title="Atualizar entrega">✎</button></td></tr>) : <tr><td colSpan="8" className="delivery-empty">Nenhuma entrega encontrada.</td></tr>}
          </tbody></table></div><footer className="delivery-table-footer">Mostrando {filtered.length} de {deliveries.length} entregas</footer></section>
        </> : <>
          <button className="delivery-back" onClick={() => setView("list")}>←　Entregas</button><header className="delivery-heading detail"><div><span className="delivery-eyebrow">OPERAÇÃO / LOGÍSTICA</span><h1>{editing ? "Atualizar entrega" : "Cadastrar entrega"}</h1><p>Vincule a entrega a um contrato e informe as quantidades.</p></div></header>
          {error && <div className="delivery-alert">{error}</div>}
          <form className="delivery-form-card" onSubmit={save}>
            <h2>Dados da entrega</h2>
            <label>Item do contrato<select name="contract_item_id" value={form.contract_item_id} onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, contract_item_id: value, ...(!editing ? { solicited_quantity: "", delivered_qtd: "" } : {}) })); }} required><option value="">Selecione um item de contrato</option>{availableItems.map((item) => { const contract = contracts.find((row) => row.id === item.contract_id); const inst = institutionById.get(contract?.institution_id) || `Instituição #${contract?.institution_id}`; const remaining = item.item_qtd - item.delivered_qtd; return <option key={item.id} value={item.id}>{item.product.name} · {contractLabel(contract?.id)} · {inst} · saldo {remaining} {item.product.measurement_unit}</option>; })}</select></label>
            {formContract && <div className="delivery-contract-context"><span><small>Contrato vinculado</small><strong>{contractLabel(formContract)}</strong></span><span><small>Instituição / Órgão</small><strong>{institutionById.get(formInstitution) || `Instituição #${formInstitution}`}</strong></span><span><small>Produto</small><strong>{selectedItem?.product.name || editingItem?.product.name}</strong></span></div>}
            {!availableItems.length && !editing && <p className="delivery-form-note">Não há itens disponíveis em contratos ativos. Cadastre ou atualize os itens do contrato antes de registrar a entrega.</p>}
            <div className="delivery-form-grid"><label>Data da entrega<input type="date" name="delivery_date" value={form.delivery_date} onChange={change} required /></label><label>Quantidade prevista<input type="number" name="solicited_quantity" min="1" value={form.solicited_quantity} onChange={change} required /></label><label>Quantidade real entregue<input type="number" name="delivered_qtd" min="1" max={form.solicited_quantity || undefined} value={form.delivered_qtd} onChange={change} required /><small>A quantidade entregue deve ser menor ou igual à solicitada.</small></label><label>Status<select name="status" value={form.status} onChange={change} required><option value="Pendente">Pendente</option><option value="Entregue">Entregue</option></select></label></div>
            {Number(form.solicited_quantity) > 0 && Number(form.delivered_qtd) > 0 && <div className="delivery-loss-summary"><span>Total de perdas</span><strong>{Math.max(0, Number(form.solicited_quantity) - Number(form.delivered_qtd))} {selectedItem?.product.measurement_unit || editingItem?.product.measurement_unit || "unidades"}</strong></div>}
            <label>Observação<textarea name="note" rows="3" maxLength="500" placeholder="Observações sobre a entrega" value={form.note} onChange={change} /></label>
            <div className="delivery-form-actions"><button type="button" className="delivery-secondary" onClick={() => setView("list")}>Cancelar</button><button type="submit" className="delivery-primary" disabled={saving || (!editing && !availableItems.length)}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Confirmar entrega"}</button></div>
          </form>
        </>}
        <footer className="delivery-footer">© 2026 CoopVale. Todos os direitos reservados.　·　CoopVale - Cooperativa dos Agricultores Familiares do Vale do Forquilha</footer>
      </main>
    </div>
  </div>;
}

export default Entregas;
