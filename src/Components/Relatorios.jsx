
import React, { useState } from "react";
import { menuIcons } from "./Icons";
import {
  Home,
  FileText,
  Truck,
  HandCoins,
  Receipt,
  Package,
  Bell,
  Settings,
  ChartColumnIncreasing,
  Clock3,
  Eye,
  Download,
  MoreVertical,
  CalendarDays,
  Landmark,
  ClipboardList,
  ChevronDown,
  FileChartColumn,
  UserRound,
} from "lucide-react";

import "../Styles/Dashboard.css";
import "../Styles/Relatorios.css";
import iconCoopVale from "../public/img/iconCoopVale.png";

function Relatorios({ onNavigate }) {
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [contrato, setContrato] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState("");

  // As opções de relatórios que aparecem lá em cima
  const tiposRelatorios = [
    {
      id: "contratos",
      nome: "Relatório de Contratos",
      descricao: "Resumo dos contratos ativos, encerrados, valores e saldo disponível.",
      icone: FileText,
      cor: "bg-[#e8f1df]",
    },
    {
      id: "entregas",
      nome: "Relatório de Entregas",
      descricao: "Resumo das entregas realizadas, pendentes e seus valores.",
      icone: Truck,
      cor: "bg-[#fff5bc]",
    },
    {
      id: "financeiro",
      nome: "Relatório Financeiro",
      descricao: "Movimentações financeiras, recebimentos e pagamentos.",
      icone: HandCoins,
      cor: "bg-[#ffd2d2]",
    },
    {
      id: "notas",
      nome: "Relatório de Notas Fiscais",
      descricao: "Notas fiscais emitidas e recebidas por período.",
      icone: Receipt,
      cor: "bg-[#f0d5fa]",
    },
    {
      id: "produtos",
      nome: "Relatório de Produtos",
      descricao: "Produtos entregues, estoque e movimentações.",
      icone: Package,
      cor: "bg-[#d4f0ff]",
    },
  ];

  const menuItems = [
    { nome: "Início", icone: menuIcons.dashboard, tela: "dashboard" },
    { nome: "Contratos / Chamadas", icone: menuIcons.contratos, tela: "contratos" },
    { nome: "Financeiro", icone: menuIcons.financeiro, tela: "financeiro" },
    { nome: "Notas Fiscais", icone: menuIcons["notas-fiscais"], tela: "notas-fiscais" },
    { nome: "Relatórios", icone: menuIcons.relatorios, tela: "relatorios" },
    { nome: "Produtos", icone: menuIcons.produtos, tela: "produtos" },
    { nome: "Entregas", icone: menuIcons.entregas, tela: "entregas" },
    { nome: "Avisos", icone: menuIcons.avisos, tela: "avisos" },
    { nome: "Configurações", icone: menuIcons.configuracoes, tela: "configuracoes" },
];

  const relatoriosRecentes = [];

  const avisarPendente = () => {
    alert("Essa funcionalidade ainda não foi integrada.");
  };

  const gerarRelatorio = () => {
    if (!tipoSelecionado) {
    alert("Escolha um tipo de relatório primeiro.");
    return;
  }

    if (dataInicial && dataFinal && dataInicial > dataFinal) {
    alert("A data inicial não pode ser maior que a data final.");
    return;
  }

  avisarPendente();
  };
  const navegar = (tela) => {
    const telasProntas = ["dashboard", "contratos", "financeiro", "relatorios"];

    if (!telasProntas.includes(tela) || !onNavigate) {
      avisarPendente();
      return;
    }

    onNavigate(tela);
  };

  return (
    <div className="dashboard-container">
      {/* Menu lateral */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={iconCoopVale} alt="CoopVale" className="sidebar-logo" />
          <span className="sidebar-subbrand">ValeGestão</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icone = item.icone;

            return (
              <button
                key={item.tela}
                type="button"
                onClick={() => navegar(item.tela)}
                className={`nav-item ${item.tela === "relatorios" ? "active" : ""}`}
              >
                <Icone size={19} strokeWidth={1.8} />
                <span>{item.nome}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="main-wrapper">
        <main className="relatorios-content flex-1 px-7 py-7">
          {/* Cabeçalho */}
          <header className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[29px] font-bold text-[#2b3823]">
                Relatórios
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Visualize e gere relatórios do sistema
              </p>
            </div>

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={avisarPendente}
                className="relative text-gray-500"
                title="Notificações"
              >
                <Bell size={22} />
                <span className="absolute -right-1 -top-2 rounded-full bg-yellow-400 px-1 text-[10px] text-black">
                  2
                </span>
              </button>

              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8f2b6] text-[#588e38]">
                  <UserRound size={23} />
                </div>
                <div className="text-xs">
                  <p className="font-semibold">Usuário</p>
                  <p className="text-gray-500">Administrador</p>
                </div>
                <ChevronDown size={15} className="text-gray-500" />
              </div>
            </div>
          </header>

          {/* Os cinco tipos de relatório */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tiposRelatorios.map((item) => {
              const Icone = item.icone;

              return (
                <article
                  key={item.id}
                  className={`flex min-h-[165px] flex-col rounded-lg border bg-white p-3 ${
                    tipoSelecionado === item.id
                      ? "border-[#588e38]"
                      : "border-gray-200"
                  }`}
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${item.cor}`}>
                    <Icone size={19} strokeWidth={1.7} />
                  </div>

                  <h2 className="text-xs font-semibold text-gray-800">
                    {item.nome}
                  </h2>

                  <p className="mt-2 flex-1 text-[11px] leading-relaxed text-gray-500">
                    {item.descricao}
                  </p>

                  <button
                    type="button"
                    onClick={() => setTipoSelecionado(item.id)}
                    className="mt-3 rounded border border-[#75a953] px-2 py-1.5 text-xs text-[#588e38] hover:bg-green-50"
                  >
                    {tipoSelecionado === item.id ? "Selecionado ✓" : "Ver relatório ›"}
                  </button>
                </article>
              );
            })}
          </section>

          {/* Filtros */}
          <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div>
            <label className="mb-2 block text-xs font-semibold">
                Data inicial
            </label>
            <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
            />
            </div>

            <div>
            <label className="mb-2 block text-xs font-semibold">
                Data final
            </label>
            <input
                type="date"
                value={dataFinal}
                min={dataInicial || undefined}
                onChange={(e) => setDataFinal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
            />
                </div>

              <div>
                <label className="mb-2 block text-xs font-semibold">Instituição/Órgão</label>
                <select
                  value={instituicao}
                  onChange={(e) => setInstituicao(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
                >
                  <option value="">Todas as instituições</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold">Contrato</label>
                <select
                  value={contrato}
                  onChange={(e) => setContrato(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
                >
                  <option value="">Todos os contratos</option>
                </select>
              </div>

              <button
                type="button"
                onClick={gerarRelatorio}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#588e38] px-4 py-3 text-sm font-medium text-white hover:bg-[#3a6322]"
              >
                <FileChartColumn size={17} />
                Gerar relatório
              </button>
            </div>
          </section>

          {/* Relatórios recentes */}
          <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <Clock3 size={18} />
              Relatórios recentes
            </h2>

            <div className="overflow-x-auto">
              <table className="relatorios-table w-full border-collapse text-left text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Período</th>
                    <th className="p-3">Gerado em</th>
                    <th className="p-3">Formato</th>
                    <th className="p-3">Ações</th>
                  </tr>
                </thead>

                <tbody>
  {relatoriosRecentes.length === 0 ? (
    <tr>
      <td
        colSpan={5}
        className="p-10 text-center text-sm text-gray-500"
      >
        Nenhum relatório gerado até o momento.
      </td>
    </tr>
  ) : (
    relatoriosRecentes.map((item) => {
      const Icone = item.icone;

      return (
        <tr key={item.id} className="border-b border-gray-200">
          <td className="p-3">
            <div className="flex items-center gap-2">
              <Icone size={16} className="text-gray-500" />
              {item.tipo}
            </div>
          </td>

          <td className="p-3">{item.periodo}</td>
          <td className="p-3">{item.data}</td>

          <td className="p-3">
            <span
              className={`rounded px-2 py-1 font-semibold text-white ${
                item.formato === "PDF" ? "bg-red-500" : "bg-[#588e38]"
              }`}
            >
              {item.formato}
            </span>
          </td>

          <td className="p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={avisarPendente}
                className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-gray-100"
              >
                <Eye size={14} />
                Visualizar
              </button>

              <button
                type="button"
                onClick={avisarPendente}
                className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-gray-100"
              >
                <Download size={14} />
                Baixar
              </button>

              <button
                type="button"
                onClick={avisarPendente}
                title="Mais opções"
                className="px-1 text-gray-500"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    })
  )}
</tbody>
              </table>
            </div>
          </section>
        </main>

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

export default Relatorios;