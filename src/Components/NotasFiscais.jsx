
import React, { useState } from "react";
import { menuIcons } from "./Icons";
import {
  Home,
  FileText,
  HandCoins,
  Receipt,
  ChartColumnIncreasing,
  Package,
  Truck,
  Bell,
  Settings,
  Search,
  Plus,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  MoreVertical,
  ChevronDown,
  UserRound,
  SlidersHorizontal,
  FilePlus2,
} from "lucide-react";

import "../Styles/Dashboard.css";
import "../Styles/NotasFiscais.css";
import iconCoopVale from "../public/img/iconCoopVale.png";

function NotasFiscais({ onNavigate }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");
  const [periodo, setPeriodo] = useState("");

  const [filtros, setFiltros] = useState({
    busca: "",
    status: "",
    tipo: "",
    periodo: "",
  });

  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);

  const [novaNota, setNovaNota] = useState({
  numero: "",
  tipo: "Entrada",
  valor: "",
  contrato: "",
  pagamento: "",
  });

  const atualizarNota = (campo, valor) => {
    setNovaNota((anterior) => ({
    ...anterior,
    [campo]: valor,
  }));
  };

  // As notas serão carregadas do banco de dados futuramente.
  const notasFiscais = [];

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

  const avisarPendente = () => {
    alert("Essa funcionalidade ainda não foi integrada.");
  };

  const navegar = (tela) => {
    const telasProntas = [
      "dashboard",
      "contratos",
      "financeiro",
      "relatorios",
      "notas-fiscais",
    ];

    if (!telasProntas.includes(tela) || !onNavigate) {
      avisarPendente();
      return;
    }

    onNavigate(tela);
  };

  const aplicarFiltros = () => {
    setFiltros({ busca, status, tipo, periodo });
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

    const correspondeTipo =
    !filtros.tipo || nota.tipo === filtros.tipo;

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
    correspondeTipo &&
    correspondePeriodo
  );
});

  const totalNotas = notasFiltradas.length;

  const emitidas = notasFiltradas.filter(
    (nota) => nota.status === "Emitida"
  ).length;

  const recebidas = notasFiltradas.filter(
    (nota) => nota.status === "Recebida"
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
      titulo: "Emitidas",
      valor: emitidas,
      icone: CheckCircle2,
      cor: "bg-[#edf3df]",
    },
    {
      titulo: "Recebidas",
      valor: recebidas,
      icone: FileText,
      cor: "bg-[#d5edfc]",
    },
    {
      titulo: "Pendentes",
      valor: pendentes,
      icone: Clock3,
      cor: "bg-[#ffdada]",
    },
  ];

  const corStatus = (situacao) => {
    switch (situacao) {
      case "Emitida":
        return "bg-sky-100 text-sky-700";
      case "Recebida":
        return "bg-green-100 text-green-700";
      case "Pendente":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="dashboard-container">
      {/* Menu lateral */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src={iconCoopVale}
            alt="CoopVale"
            className="sidebar-logo"
          />
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
                className={`nav-item ${
                  item.tela === "notas-fiscais" ? "active" : ""
                }`}
              >
                <Icone size={19} strokeWidth={1.8} />
                <span>{item.nome}</span>
              </button>
            );
          })}
        </nav>
      </aside>

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
                onClick={avisarPendente}
                className="relative text-gray-500"
                title="Notificações"
              >
                <Bell size={22} />
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

          {/* Cadastro de notas fiscais */}
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setModalCadastroAberto(true)}
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
              <option value="Emitida">Emitida</option>
              <option value="Recebida">Recebida</option>
              <option value="Pendente">Pendente</option>
            </select>

            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="notas-input xl:col-span-2"
            >
              <option value="">Tipo</option>
              <option value="Entrada">Entrada</option>
              <option value="Saída">Saída</option>
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
                  {notasFiltradas.length === 0 ? (
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
                              onClick={avisarPendente}
                              title="Visualizar"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={avisarPendente}
                              className="flex items-center gap-1 rounded border px-2 py-1"
                            >
                              <Download size={14} />
                              Baixar
                            </button>

                            <button
                              type="button"
                              onClick={avisarPendente}
                              title="Mais opções"
                            >
                              <MoreVertical size={16} />
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
                onSubmit={(e) => {
                  e.preventDefault();
                  avisarPendente();
                }}
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
                    <label htmlFor="nota-tipo">Tipo</label>
                    <select
                      id="nota-tipo"
                      value={novaNota.tipo}
                      onChange={(e) =>
                        atualizarNota("tipo", e.target.value)
                      }
                    >
                      <option value="Entrada">Entrada</option>
                      <option value="Saída">Saída</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="nota-valor">Valor da nota (R$)</label>
                    <input
                      id="nota-valor"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={novaNota.valor}
                      onChange={(e) =>
                        atualizarNota("valor", e.target.value)
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
                      onChange={(e) =>
                        atualizarNota("contrato", e.target.value)
                      }
                    >
                      <option value="">Selecione um contrato</option>
                    </select>
                  </div>

                  <div>
                  <label>Pagamentos vinculados</label>

                  <p className="notas-modal-info">
                    Os pagamentos serão vinculados após a integração
                    com o módulo Financeiro.
                  </p>
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

                  <button type="submit" className="notas-salvar">
                    Salvar nota fiscal
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
