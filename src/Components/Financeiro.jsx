import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../context/AuthContext";
import iconCoopVale from "../public/img/iconCoopVale.png";
import "../Styles/Dashboard.css";
import "../Styles/Financeiro.css";

const emptyForm = {
  contract_id: "",
  amount: "",
  payment_date: new Date().toISOString().slice(0, 10),
  note: "",
};

const formatCurrency = (cents = 0) =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatDate = (date) => {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

function Financeiro({ onNavigate }) {
  const { session } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [contractData, paymentData] = await Promise.all([
        invoke("list_contracts"),
        invoke("list_payments"),
      ]);
      setContracts(contractData);
      setPayments(paymentData);
      setSelectedContractId((current) =>
        current && contractData.some((contract) => contract.id === Number(current))
          ? current
          : "",
      );
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
      setError(`Não foi possível carregar os dados financeiros: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const totals = useMemo(() => {
    const contracted = contracts.reduce(
      (total, contract) => total + contract.total_value_cents,
      0,
    );
    const received = payments.reduce(
      (total, payment) => total + payment.amount_cents,
      0,
    );
    return { contracted, received, remaining: contracted - received };
  }, [contracts, payments]);

  const contractBalances = useMemo(
    () =>
      contracts.map((contract) => {
        const totalPaid = payments
          .filter((payment) => payment.contract_id === contract.id)
          .reduce((total, payment) => total + payment.amount_cents, 0);
        return {
          ...contract,
          total_paid_cents: totalPaid,
          remaining_cents: contract.total_value_cents - totalPaid,
        };
      }),
    [contracts, payments],
  );

  const visiblePayments = useMemo(
    () =>
      selectedContractId
        ? payments.filter(
            (payment) => payment.contract_id === Number(selectedContractId),
          )
        : payments,
    [payments, selectedContractId],
  );

  const resetForm = () => {
    setForm({ ...emptyForm, payment_date: new Date().toISOString().slice(0, 10) });
    setEditingPaymentId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor de pagamento maior que zero.");
      return;
    }
    if (!form.contract_id) {
      setError("Selecione o contrato relacionado ao pagamento.");
      return;
    }

    const data = {
      contract_id: Number(form.contract_id),
      amount_cents: Math.round(amount * 100),
      payment_date: form.payment_date,
      note: form.note.trim(),
    };

    setSaving(true);
    try {
      if (editingPaymentId === null) {
        await invoke("create_payment", { data });
        setSuccess("Pagamento registrado com sucesso.");
      } else {
        await invoke("update_payment", { id: editingPaymentId, data });
        setSuccess("Pagamento atualizado com sucesso.");
      }
      resetForm();
      await loadFinancialData();
    } catch (err) {
      console.error("Erro ao salvar pagamento:", err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (payment) => {
    setError("");
    setSuccess("");
    setEditingPaymentId(payment.id);
    setForm({
      contract_id: String(payment.contract_id),
      amount: (payment.amount_cents / 100).toFixed(2),
      payment_date: payment.payment_date,
      note: payment.note,
    });
  };

  const handleDelete = async (payment) => {
    if (!window.confirm("Deseja realmente excluir este pagamento?")) return;
    setError("");
    setSuccess("");
    try {
      await invoke("delete_payment", { id: payment.id });
      if (editingPaymentId === payment.id) resetForm();
      setSuccess("Pagamento excluído com sucesso.");
      await loadFinancialData();
    } catch (err) {
      console.error("Erro ao excluir pagamento:", err);
      setError(String(err));
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={iconCoopVale} alt="CoopVale Logo" className="sidebar-logo" />
          <span className="sidebar-subbrand">ValeGestão</span>
        </div>
        <nav className="sidebar-nav">
          <button type="button" className="nav-item" onClick={() => onNavigate("dashboard")}>
            <span className="nav-icon">🏠</span><span>Início</span>
          </button>
          <button type="button" className="nav-item" onClick={() => onNavigate("contratos")}>
            <span className="nav-icon">📑</span><span>Contratos / Chamadas</span>
          </button>
          <button type="button" className="nav-item active" onClick={() => onNavigate("financeiro")}>
            <span className="nav-icon">💲</span><span>Financeiro</span>
          </button>
        </nav>
      </aside>

      <div className="main-wrapper">
        <main className="finance-content">
          <header className="finance-header">
            <div>
              <h1>Financeiro</h1>
              <p>Pagamentos recebidos e saldos dos contratos</p>
            </div>
            <span className="finance-user">{session?.name || "CoopVale"}</span>
          </header>

          {error && <div className="finance-message error" role="alert">{error}</div>}
          {success && <div className="finance-message success" role="status">{success}</div>}

          <section className="finance-summary" aria-label="Resumo financeiro">
            <article className="finance-summary-card">
              <span>Valor contratado</span>
              <strong>{formatCurrency(totals.contracted)}</strong>
            </article>
            <article className="finance-summary-card">
              <span>Valor recebido</span>
              <strong>{formatCurrency(totals.received)}</strong>
            </article>
            <article className="finance-summary-card">
              <span>Saldo a receber</span>
              <strong>{formatCurrency(totals.remaining)}</strong>
            </article>
          </section>

          <section className="finance-panel">
            <div className="finance-panel-header">
              <div>
                <h2>{editingPaymentId === null ? "Registrar pagamento" : "Editar pagamento"}</h2>
                <p>Os pagamentos são vinculados a um contrato e limitados ao saldo disponível.</p>
              </div>
            </div>
            <form className="finance-form" onSubmit={handleSubmit}>
              <label>
                Contrato
                <select
                  required
                  value={form.contract_id}
                  onChange={(event) => setForm((current) => ({ ...current, contract_id: event.target.value }))}
                >
                  <option value="">Selecione um contrato</option>
                  {contractBalances.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {`Contrato #${contract.id} — saldo ${formatCurrency(contract.remaining_cents)}`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor (R$)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="0,00"
                />
              </label>
              <label>
                Data do pagamento
                <input
                  type="date"
                  required
                  value={form.payment_date}
                  onChange={(event) => setForm((current) => ({ ...current, payment_date: event.target.value }))}
                />
              </label>
              <label className="finance-note-field">
                Observação
                <input
                  type="text"
                  maxLength="500"
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Opcional"
                />
              </label>
              <div className="finance-form-actions">
                {editingPaymentId !== null && (
                  <button type="button" className="finance-secondary-button" onClick={resetForm}>
                    Cancelar edição
                  </button>
                )}
                <button type="submit" className="finance-primary-button" disabled={saving || loading || contracts.length === 0}>
                  {saving ? "Salvando..." : editingPaymentId === null ? "Registrar pagamento" : "Salvar alterações"}
                </button>
              </div>
            </form>
            {!loading && contracts.length === 0 && (
              <p className="finance-empty">Cadastre um contrato antes de registrar pagamentos.</p>
            )}
          </section>

          <section className="finance-panel">
            <div className="finance-panel-header finance-payments-header">
              <div>
                <h2>Pagamentos</h2>
                <p>{visiblePayments.length} registro(s)</p>
              </div>
              <label className="finance-filter">
                Filtrar por contrato
                <select value={selectedContractId} onChange={(event) => setSelectedContractId(event.target.value)}>
                  <option value="">Todos os contratos</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>Contrato #{contract.id}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="finance-table-wrapper">
              <table className="finance-table">
                <thead>
                  <tr><th>Contrato</th><th>Data</th><th>Observação</th><th>Valor</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="finance-table-empty">Carregando pagamentos...</td></tr>
                  ) : visiblePayments.length ? (
                    visiblePayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>Contrato #{payment.contract_id}</td>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{payment.note || "—"}</td>
                        <td>{formatCurrency(payment.amount_cents)}</td>
                        <td className="finance-row-actions">
                          <button type="button" onClick={() => handleEdit(payment)}>Editar</button>
                          <button type="button" className="delete" onClick={() => handleDelete(payment)}>Excluir</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="finance-table-empty">Nenhum pagamento encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Financeiro;
