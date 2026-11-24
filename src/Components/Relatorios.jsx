import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Clock3,
  Download,
  Eye,
  FileChartColumn,
  FileText,
  HandCoins,
  Package,
  Receipt,
  Truck,
} from "lucide-react";
import { menuIcons } from "./Icons";
import "../Styles/Dashboard.css";
import "../Styles/Relatorios.css";
import iconCoopVale from "../public/img/iconCoopVale.png";

const reportTypes = [
  { id: "contratos", name: "Relatório de Contratos", description: "Contratos, instituições, valores e situação.", icon: FileText },
  { id: "entregas", name: "Relatório de Entregas", description: "Entregas, itens, quantidades e status.", icon: Truck },
  { id: "financeiro", name: "Relatório Financeiro", description: "Pagamentos registrados por contrato.", icon: HandCoins },
  { id: "notas", name: "Relatório de Notas Fiscais", description: "Notas fiscais e conferência dos pagamentos.", icon: Receipt },
  { id: "produtos", name: "Relatório de Produtos", description: "Catálogo, unidade, categoria e preço.", icon: Package },
];

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

const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

function Relatorios({ onNavigate }) {
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [contrato, setContrato] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [records, setRecords] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sourceData, setSourceData] = useState({
    contracts: [],
    deliveries: [],
    payments: [],
    invoices: [],
    products: [],
    institutions: [],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [contracts, deliveries, payments, invoices, products, institutions] =
        await Promise.all([
          invoke("list_contracts"),
          invoke("list_deliveries"),
          invoke("list_payments"),
          invoke("list_invoices"),
          invoke("list_products"),
          invoke("list_institutions"),
        ]);
      setSourceData({ contracts, deliveries, payments, invoices, products, institutions });
    } catch (err) {
      console.error("Erro ao carregar dados dos relatórios:", err);
      setError(`Não foi possível carregar os dados para relatórios: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const contractsById = useMemo(
    () => new Map(sourceData.contracts.map((item) => [item.id, item])),
    [sourceData.contracts],
  );
  const institutionsById = useMemo(
    () => new Map(sourceData.institutions.map((item) => [item.id, item])),
    [sourceData.institutions],
  );

  const reportRows = (type) => {
    const dateMatches = (date) =>
      (!dataInicial || !date || date >= dataInicial) &&
      (!dataFinal || !date || date <= dataFinal);
    const contractMatches = (contractId) =>
      (!contrato || contractId === Number(contrato)) &&
      (!instituicao || contractsById.get(contractId)?.institution_id === Number(instituicao));

    switch (type) {
      case "contratos":
        return sourceData.contracts
          .filter((item) => contractMatches(item.id))
          .filter((item) => (!dataInicial || item.end_date >= dataInicial) && (!dataFinal || item.start_date <= dataFinal))
          .map((item) => ({
            Contrato: `#${item.id}`,
            Instituição: institutionsById.get(item.institution_id)?.name ?? `Instituição #${item.institution_id}`,
            Início: formatDate(item.start_date),
            Término: formatDate(item.end_date),
            Valor: formatCurrency(item.total_value_cents),
            Status: item.status,
          }));
      case "entregas":
        return sourceData.deliveries
          .filter((item) => contractMatches(item.contract.id) && dateMatches(item.delivery_date))
          .map((item) => ({
            Entrega: `#${item.id}`,
            Data: formatDate(item.delivery_date),
            Contrato: `#${item.contract.id}`,
            Instituição: institutionsById.get(item.contract.institution_id)?.name ?? `Instituição #${item.contract.institution_id}`,
            Produto: item.contract_item.product.name,
            Quantidade: `${item.delivered_qtd} / ${item.solicited_quantity} ${item.contract_item.product.measurement_unit}`,
            Status: item.status,
          }));
      case "financeiro":
        return sourceData.payments
          .filter((item) => contractMatches(item.contract_id) && dateMatches(item.payment_date))
          .map((item) => ({
            Pagamento: `#${item.id}`,
            Data: formatDate(item.payment_date),
            Contrato: `#${item.contract_id}`,
            Instituição: institutionsById.get(contractsById.get(item.contract_id)?.institution_id)?.name ?? "—",
            Valor: formatCurrency(item.amount_cents),
            Observação: item.note || "—",
          }));
      case "notas":
        return sourceData.invoices
          .filter((item) => contractMatches(item.contract_id) && dateMatches(item.issue_date ?? item.payment_date))
          .map((item) => ({
            Número: item.number ?? `Pagamento #${item.payment_id}`,
            Data: formatDate(item.issue_date ?? item.payment_date),
            Contrato: `#${item.contract_id}`,
            Instituição: institutionsById.get(contractsById.get(item.contract_id)?.institution_id)?.name ?? "—",
            Valor: formatCurrency(item.amount_cents ?? item.payment_amount_cents),
            Status: item.status,
          }));
      case "produtos":
        return sourceData.products
          .map((item) => ({
            Produto: item.name,
            Categoria: item.category,
            Unidade: item.measurement_unit,
            "Preço de referência": formatCurrency(item.reference_price_cents),
            Status: item.status,
          }));
      default:
        return [];
    }
  };

  const gerarRelatorio = () => {
    if (!tipoSelecionado) {
      setError("Selecione um tipo de relatório.");
      return;
    }
    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      setError("A data inicial não pode ser posterior à data final.");
      return;
    }

    const rows = reportRows(tipoSelecionado);
    const selectedType = reportTypes.find((item) => item.id === tipoSelecionado);
    const report = {
      id: `${Date.now()}-${tipoSelecionado}`,
      name: selectedType.name,
      period: dataInicial || dataFinal
        ? `${dataInicial ? formatDate(dataInicial) : "Início"} até ${dataFinal ? formatDate(dataFinal) : "Hoje"}`
        : "Todo o período",
      generatedAt: new Date().toLocaleString("pt-BR"),
      rows,
    };
    setRecords(report);
    setRecentReports((current) => [report, ...current]);
    setError("");
    setSuccess(`Relatório gerado com ${rows.length} registro(s).`);
  };

  const downloadReport = (report) => {
    if (!report.rows.length) {
      setError("Não há registros para exportar neste relatório.");
      return;
    }
    const columns = Object.keys(report.rows[0]);
    const content = [
      columns.map(csvValue).join(";"),
      ...report.rows.map((row) => columns.map((column) => csvValue(row[column])).join(";")),
    ].join("\r\n");
    const file = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.name.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const navigation = [
    ["dashboard", "Início"],
    ["contratos", "Contratos / Chamadas"],
    ["financeiro", "Financeiro"],
    ["instituicoes", "Instituições"],
    ["notas-fiscais", "Notas Fiscais"],
    ["produtos", "Produtos"],
    ["entregas", "Entregas"],
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
              <button key={screen} type="button" onClick={() => onNavigate?.(screen)} className="nav-item">
                {Icon && <Icon size={19} strokeWidth={1.8} />}
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="main-wrapper">
        <main className="relatorios-content flex-1 px-7 py-7">
          <header className="mb-5">
            <h1 className="text-[29px] font-bold text-[#2b3823]">Relatórios</h1>
            <p className="mt-1 text-sm text-gray-500">Gere e exporte relatórios a partir dos dados cadastrados.</p>
          </header>

          {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {reportTypes.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.id} className={`flex min-h-[165px] flex-col rounded-lg border bg-white p-3 ${tipoSelecionado === item.id ? "border-[#588e38]" : "border-gray-200"}`}>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f1df]"><Icon size={19} /></div>
                  <h2 className="text-xs font-semibold text-gray-800">{item.name}</h2>
                  <p className="mt-2 flex-1 text-[11px] leading-relaxed text-gray-500">{item.description}</p>
                  <button type="button" onClick={() => { setTipoSelecionado(item.id); setError(""); }} className="mt-3 rounded border border-[#75a953] px-2 py-1.5 text-xs text-[#588e38]">
                    {tipoSelecionado === item.id ? "Selecionado ✓" : "Selecionar"}
                  </button>
                </article>
              );
            })}
          </section>

          <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-xs font-semibold">Data inicial
                <input type="date" value={dataInicial} max={dataFinal || undefined} onChange={(event) => setDataInicial(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold">Data final
                <input type="date" value={dataFinal} min={dataInicial || undefined} onChange={(event) => setDataFinal(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold">Instituição/Órgão
                <select value={instituicao} onChange={(event) => setInstituicao(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-normal">
                  <option value="">Todas as instituições</option>
                  {sourceData.institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold">Contrato
                <select value={contrato} onChange={(event) => setContrato(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-normal">
                  <option value="">Todos os contratos</option>
                  {sourceData.contracts.map((item) => <option key={item.id} value={item.id}>Contrato #{item.id}</option>)}
                </select>
              </label>
              <button type="button" onClick={gerarRelatorio} disabled={loading} className="flex items-center justify-center gap-2 rounded-lg bg-[#588e38] px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
                <FileChartColumn size={17} />{loading ? "Carregando dados..." : "Gerar relatório"}
              </button>
            </div>
            {tipoSelecionado === "produtos" && <p className="mt-3 text-xs text-gray-500">Os filtros de instituição e contrato não se aplicam ao catálogo de produtos.</p>}
          </section>

          {records && (
            <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">{records.name}</h2>
                  <p className="text-xs text-gray-500">{records.rows.length} registro(s) · {records.period}</p>
                </div>
                <button type="button" onClick={() => downloadReport(records)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Download size={15} /> Baixar CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="relatorios-table w-full border-collapse text-left text-xs">
                  <thead className="bg-gray-100"><tr>{records.rows.length > 0 && Object.keys(records.rows[0]).map((column) => <th key={column} className="p-3">{column}</th>)}</tr></thead>
                  <tbody>
                    {records.rows.length === 0 ? <tr><td className="p-8 text-center text-gray-500">Nenhum registro corresponde aos filtros.</td></tr> : records.rows.map((row, index) => <tr key={index} className="border-b border-gray-100">{Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="p-3">{value}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><Clock3 size={18} /> Relatórios recentes</h2>
            <div className="overflow-x-auto">
              <table className="relatorios-table w-full border-collapse text-left text-xs">
                <thead className="bg-gray-100"><tr><th className="p-3">Tipo</th><th className="p-3">Período</th><th className="p-3">Gerado em</th><th className="p-3">Registros</th><th className="p-3">Ações</th></tr></thead>
                <tbody>
                  {recentReports.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-sm text-gray-500">Nenhum relatório gerado nesta sessão.</td></tr> : recentReports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-200">
                      <td className="p-3">{report.name}</td>
                      <td className="p-3">{report.period}</td>
                      <td className="p-3">{report.generatedAt}</td>
                      <td className="p-3">{report.rows.length}</td>
                      <td className="p-3"><div className="flex gap-2">
                        <button type="button" onClick={() => { setRecords(report); setSuccess(""); }} title="Visualizar relatório" className="flex items-center gap-1 rounded border px-2 py-1"><Eye size={14} /> Visualizar</button>
                        <button type="button" onClick={() => downloadReport(report)} title="Baixar CSV" className="flex items-center gap-1 rounded border px-2 py-1"><Download size={14} /> Baixar</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
        <footer className="footer-bar">
          <span>© 2026 CoopVale. Todos os direitos reservados.</span>
          <span>CoopVale - Cooperativa dos Agricultores Familiares do Vale do Forquilha</span>
          <span>Versão 1.0.0</span>
        </footer>
      </div>
    </div>
  );
}

export default Relatorios;
