
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from "../utils/inputFormatters";
import SidebarNavigation from "./SidebarNavigation";
import UserProfileButton from "./UserProfileButton";
import {
  Receipt,
  Bell,
  Search,
  Plus,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  FilePlus2,
} from "lucide-react";

import "../Styles/Dashboard.css";
import "../Styles/NotasFiscais.css";

function NotasFiscais({ onNavigate }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [periodo, setPeriodo] = useState("");

  const [filtros, setFiltros] = useState({
    busca: "",
    status: "",
    periodo: "",
  });

  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [novaNota, setNovaNota] = useState({
    numero: "",
    valor: "",
    data_emissao: new Date().toISOString().slice(0, 10),
    contrato: "",
    pagamento: "",
  });

  const atualizarNota = (campo, valor) => {
    setNovaNota((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
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

  const loadInvoiceData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invoiceData, contractData, paymentData, institutionData] =
        await Promise.all([
          invoke("list_invoices"),
          invoke("list_contracts"),
          invoke("list_payments"),
          invoke("list_institutions"),
        ]);

      setContracts(contractData || []);
      setPayments(paymentData || []);
      setInstitutions(institutionData || []);
      setNotasFiscais(
        (invoiceData || []).map((invoice) => {
          const contract = (contractData || []).find(
            (item) => item.id === invoice.contract_id,
          );
          const institution = (institutionData || []).find(
            (item) => item.id === contract?.institution_id,
          );

          return {
            id: invoice.payment_id,
            payment_id: invoice.payment_id,
            contract_id: invoice.contract_id,
            numero: invoice.number || `P${invoice.payment_id}`,
            number: invoice.number,
            amount_cents: invoice.amount_cents,
            issue_date: invoice.issue_date,
            tipo: "Saída",
            fornecedor: institution?.name || "Não informado",
            contrato: String(invoice.contract_id),
            dataEmissaoISO: invoice.issue_date,
            dataEmissao: invoice.issue_date
              ? formatDate(invoice.issue_date)
              : "—",
            valor: formatCurrency(
              invoice.amount_cents ?? invoice.payment_amount_cents,
            ),
            status: invoice.status,
          };
        }),
      );
    } catch (err) {
      console.error("Erro ao carregar notas fiscais:", err);
      setError(`Não foi possível carregar as notas fiscais: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoiceData();
  }, [loadInvoiceData]);

  const availablePayments = useMemo(() => {
    const paymentIdsWithInvoice = new Set(
      notasFiscais
        .filter((invoice) => invoice.number)
        .map((invoice) => invoice.payment_id),
    );

    return payments.filter(
      (payment) =>
        !paymentIdsWithInvoice.has(payment.id) &&
        (editingPaymentId !== null ||
          !novaNota.contrato ||
          payment.contract_id === Number(novaNota.contrato)),
    );
  }, [payments, notasFiscais, novaNota.contrato, editingPaymentId]);

  const openRegistrationModal = () => {
    setEditingPaymentId(null);
    setNovaNota({
      numero: "",
      valor: "",
      data_emissao: new Date().toISOString().slice(0, 10),
      contrato: "",
      pagamento: "",
    });
    setError("");
    setSuccess("");
    setModalCadastroAberto(true);
  };

  const openEditModal = (invoice) => {
    const hasInvoice = Boolean(invoice.number);
    setEditingPaymentId(hasInvoice ? invoice.payment_id : null);
    const pendingPayment = payments.find(
      (payment) => payment.id === invoice.payment_id,
    );
    setNovaNota({
      numero: invoice.number || "",
      valor: invoice.amount_cents
        ? formatCurrencyInput(String(invoice.amount_cents))
        : pendingPayment
          ? formatCurrencyInput(String(pendingPayment.amount_cents))
          : "",
      data_emissao: invoice.issue_date || new Date().toISOString().slice(0, 10),
      contrato: String(invoice.contract_id),
      pagamento: String(invoice.payment_id),
    });
    setError("");
    setSuccess("");
    setModalCadastroAberto(true);
  };

  const handleRemoveInvoice = async (invoice) => {
    if (!window.confirm("Deseja remover a nota fiscal deste pagamento?")) return;
    setError("");
    setSuccess("");
    try {
      await invoke("remove_invoice", { paymentId: invoice.payment_id });
      setSuccess("Nota fiscal removida com sucesso.");
      await loadInvoiceData();
    } catch (err) {
      console.error("Erro ao remover nota fiscal:", err);
      setError(String(err));
    }
  };

  const handleSubmitInvoice = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!novaNota.pagamento) {
      setError("Selecione o pagamento relacionado à nota fiscal.");
      return;
    }

    const amount = parseCurrencyInput(novaNota.valor);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor de nota fiscal maior que zero.");
      return;
    }

    const data = {
      number: novaNota.numero.trim(),
      amount_cents: Math.round(amount * 100),
      issue_date: novaNota.data_emissao,
    };

    setSaving(true);
    try {
      const result = editingPaymentId
        ? await invoke("update_invoice", {
            paymentId: editingPaymentId,
            data,
          })
        : await invoke("register_invoice", {
            paymentId: Number(novaNota.pagamento),
            data,
          });

      setSuccess(result.message);
      setModalCadastroAberto(false);
      await loadInvoiceData();
    } catch (err) {
      console.error("Erro ao salvar nota fiscal:", err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const navegar = (tela) => onNavigate?.(tela);

  const aplicarFiltros = () => {
    setFiltros({ busca, status, periodo });
  };

  const notasFiltradas = notasFiscais.filter((nota) => {
    const termo = filtros.busca.toLowerCase();

    const correspondeBusca =
      !termo ||
      [nota.numero, nota.fornecedor, nota.contrato].some((campo) =>
        String(campo ?? "").toLowerCase().includes(termo)
      );

    const correspondeStatus =
      !filtros.status || nota.status === filtros.status;

    let correspondePeriodo = true;

    if (filtros.periodo) {
      const dataNota = new Date(`${nota.dataEmissaoISO}T12:00:00`);
      const hoje = new Date();

    if (Number.isNaN(dataNota.getTime())) {
      correspondePeriodo = false;
    } else if (filtros.periodo === "mes-atual") {
      correspondePeriodo =
        dataNota.getMonth() === hoje.getMonth() &&
        dataNota.getFullYear() === hoje.getFullYear();
    } else if (filtros.periodo === "mes-anterior") {
      const mesAnterior = new Date(
        hoje.getFullYear(),
        hoje.getMonth() - 1,
        1
      );

      correspondePeriodo =
        dataNota.getMonth() === mesAnterior.getMonth() &&
        dataNota.getFullYear() === mesAnterior.getFullYear();
    } else if (filtros.periodo === "ano-atual") {
      correspondePeriodo =
        dataNota.getFullYear() === hoje.getFullYear();
    }
  }

  return (
    correspondeBusca &&
    correspondeStatus &&
    correspondePeriodo
  );
});

  const totalNotas = notasFiltradas.length;

  const conferidas = notasFiltradas.filter(
    (nota) => nota.status === "Conferida"
  ).length;

  const divergentes = notasFiltradas.filter(
    (nota) => nota.status === "Divergente"
  ).length;

  const pendentes = notasFiltradas.filter(
    (nota) => nota.status === "Pendente"
  ).length;

  const indicadores = [
    {
      titulo: "Total de notas fiscais",
      valor: totalNotas,
      icone: Receipt,
      cor: "bg-[#e7efdc]",
    },
    {
      titulo: "Conferidas",
      valor: conferidas,
      icone: CheckCircle2,
      cor: "bg-[#edf3df]",
    },
    {
      titulo: "Divergentes",
      valor: divergentes,
      icone: Bell,
      cor: "bg-[#ffdada]",
    },
    {
      titulo: "Pendentes",
      valor: pendentes,
      icone: Clock3,
      cor: "bg-[#fff1b8]",
    },
  ];

  const corStatus = (situacao) => {
    switch (situacao) {
      case "Conferida":
        return "bg-sky-100 text-sky-700";
      case "Divergente":
        return "bg-red-100 text-red-700";
      case "Pendente":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="dashboard-container">
      <SidebarNavigation onNavigate={navegar} activeScreen="notas-fiscais" />

      <div className="main-wrapper">
        <main className="notas-content flex-1 px-7 py-7">
          {/* Cabeçalho */}
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[29px] font-bold text-[#2b3823]">
                Notas Fiscais
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Gerencie as notas fiscais da cooperativa
              </p>
            </div>

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => onNavigate?.("dashboard")}
                className="relative text-gray-500"
                title="Notificações"
              >
                <Bell size={22} />
              </button>

              <UserProfileButton onClick={() => navegar("perfil")} />
            </div>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">
              {success}
            </div>
          )}

          {/* Cadastro de notas fiscais */}
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={openRegistrationModal}
              className="flex items-center gap-2 rounded-lg bg-[#588e38] px-4 py-3 text-sm font-medium text-white hover:bg-[#3a6322]"
            >
              <Plus size={19} />
              Cadastrar nota fiscal
            </button>
          </div>

          {/* Filtros */}
          <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="relative sm:col-span-2 xl:col-span-4">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar número, fornecedor ou contrato..."
                className="notas-input w-full !pl-10"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="notas-input xl:col-span-2"
            >
              <option value="">Status</option>
              <option value="Conferida">Conferida</option>
              <option value="Divergente">Divergente</option>
              <option value="Pendente">Pendente</option>
            </select>

            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="notas-input xl:col-span-2"
            >
              <option value="">Período</option>
              <option value="mes-atual">Mês atual</option>
              <option value="mes-anterior">Mês anterior</option>
              <option value="ano-atual">Ano atual</option>
            </select>

            <button
              type="button"
              onClick={aplicarFiltros}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#e7f1d9] px-3 py-3 text-xs font-medium text-[#588e38] hover:bg-[#d8e9c7] xl:col-span-2"
            >
              <SlidersHorizontal size={16} />
              Aplicar filtros
            </button>
          </section>

          {/* Indicadores */}
          <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {indicadores.map((item) => {
              const Icone = item.icone;

              return (
                <article
                  key={item.titulo}
                  className="rounded-xl border border-gray-200 bg-white p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${item.cor}`}
                    >
                      <Icone size={19} strokeWidth={1.8} />
                    </div>
                    <h2 className="text-xs font-semibold text-gray-700">
                      {item.titulo}
                    </h2>
                  </div>

                  <p className="text-3xl font-bold text-[#36452b]">
                    {item.valor}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    No período selecionado
                  </p>
                </article>
              );
            })}
          </section>

          {/* Lista de notas fiscais */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <FilePlus2 size={19} />
              Notas Fiscais cadastradas
            </h2>

            <div className="overflow-x-auto">
              <table className="notas-table w-full text-left text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3">Número</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3">Contrato</th>
                    <th className="p-3">Data de emissão</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-sm text-gray-500">
                        Carregando notas fiscais...
                      </td>
                    </tr>
                  ) : notasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-12 text-center text-sm text-gray-500"
                      >
                        Nenhuma nota fiscal encontrada.
                      </td>
                    </tr>
                  ) : (
                    notasFiltradas.map((nota) => (
                      <tr
                        key={nota.id}
                        className="border-b border-gray-200"
                      >
                        <td className="p-3">{nota.numero}</td>
                        <td className="p-3">{nota.tipo}</td>
                        <td className="p-3">{nota.fornecedor}</td>
                        <td className="p-3">{nota.contrato}</td>
                        <td className="p-3">{nota.dataEmissao}</td>
                        <td className="p-3">{nota.valor}</td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-2 py-1 font-medium ${corStatus(
                              nota.status
                            )}`}
                          >
                            {nota.status}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(nota)}
                              title={nota.status === "Pendente" ? "Cadastrar nota" : "Editar nota"}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              disabled={nota.status === "Pendente"}
                              onClick={() => handleRemoveInvoice(nota)}
                              className="flex items-center gap-1 rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Remover nota"
                            >
                              <Download size={14} />
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Mostrando {notasFiltradas.length} de {notasFiscais.length} notas fiscais
            </p>
          </section>
                </main>

        {modalCadastroAberto && (
          <div className="notas-modal-overlay">
            <div
              className="notas-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-cadastro-nota"
            >
              <div className="notas-modal-header">
                <h2 id="titulo-cadastro-nota">Cadastrar nota fiscal</h2>

                <button
                  type="button"
                  onClick={() => setModalCadastroAberto(false)}
                  aria-label="Fechar janela"
                >
                  ✕
                </button>
              </div>

              <p className="notas-modal-description">
                Preencha os dados da nota fiscal e informe o pagamento associado.
              </p>

              <form
                onSubmit={handleSubmitInvoice}
                >

                <div className="notas-modal-fields">
                  <div>
                    <label htmlFor="nota-numero">Número da nota fiscal</label>
                    <input
                      id="nota-numero"
                      type="text"
                      required
                      placeholder="Ex.: NF 000123"
                      value={novaNota.numero}
                      onChange={(e) =>
                        atualizarNota("numero", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="nota-valor">Valor da nota (R$)</label>
                    <input
                      id="nota-valor"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0,00"
                      value={novaNota.valor}
                      onChange={(e) =>
                        atualizarNota(
                          "valor",
                          formatCurrencyInput(e.target.value),
                        )
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="nota-data-emissao">Data de emissão</label>
                    <input
                      id="nota-data-emissao"
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      value={novaNota.data_emissao}
                      onChange={(e) =>
                        atualizarNota("data_emissao", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="nota-contrato">
                      Contrato associado
                    </label>

                    <select
                      id="nota-contrato"
                      value={novaNota.contrato}
                      disabled={Boolean(editingPaymentId)}
                      onChange={(e) => {
                        atualizarNota("contrato", e.target.value);
                        atualizarNota("pagamento", "");
                      }}
                    >
                      <option value="">Selecione um contrato</option>
                      {contracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          Contrato #{contract.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="nota-pagamento">Pagamento vinculado</label>
                    <select
                      id="nota-pagamento"
                      value={novaNota.pagamento}
                      disabled={Boolean(editingPaymentId)}
                      onChange={(e) => {
                        const paymentId = e.target.value;
                        const payment = payments.find(
                          (item) => item.id === Number(paymentId),
                        );
                        atualizarNota("pagamento", paymentId);
                        if (payment) {
                          atualizarNota(
                            "contrato",
                            String(payment.contract_id),
                          );
                          atualizarNota(
                            "valor",
                            formatCurrencyInput(String(payment.amount_cents)),
                          );
                        }
                      }}
                    >
                      <option value="">Selecione um pagamento</option>
                      {availablePayments.map((payment) => (
                        <option key={payment.id} value={payment.id}>
                          {formatCurrency(payment.amount_cents)} —{" "}
                          {formatDate(payment.payment_date)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="notas-modal-actions">
                  <button
                    type="button"
                    className="notas-cancelar"
                    onClick={() => setModalCadastroAberto(false)}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="notas-salvar" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar nota fiscal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="footer-bar">
          <span>© 2026 CoopVale. Todos os direitos reservados.</span>
          <span>
            CoopVale - Cooperativa dos Agricultores Familiares do Vale do Forquilha
          </span>
          <span>Versão 1.0.0</span>
        </footer>
      </div>
    </div>
  );
}

export default NotasFiscais;
