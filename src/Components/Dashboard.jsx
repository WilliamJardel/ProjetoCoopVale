import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../Styles/Dashboard.css";
import { useAuth } from "../context/AuthContext";
import iconCoopVale from "../public/img/iconCoopVale.png";

function Dashboard({ onNavigate }) {
  const { session, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    async function loadDashboardSummary() {
      try {
        setSummary(await invoke("get_dashboard_summary"));
      } catch (err) {
        console.error("Erro ao carregar o resumo do dashboard:", err);
        setSummaryError(`Não foi possível carregar o dashboard: ${err}`);
      }
    }
    loadDashboardSummary();
  }, []);

  const formatCurrency = (cents) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const formatDate = (date) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
      new Date(`${date}T00:00:00Z`),
    );

  return (
    <div className="dashboard-container">
      {/* Sidebar Lateral */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src={iconCoopVale}
            alt="CoopVale Logo"
            className="sidebar-logo"
          />
          <span className="sidebar-subbrand">ValeGestão</span>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className="nav-item active"
            onClick={() => onNavigate && onNavigate("dashboard")}
          >
            <span className="nav-icon">📄</span>
            <span>Início</span>
          </button>
          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate && onNavigate("contratos")}
          >
            <span className="nav-icon">📑</span>
            <span>Contratos / Chamadas</span>
          </button>
          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate && onNavigate("financeiro")}
          >
            <span className="nav-icon">💲</span>
            <span>Financeiro</span>
          </button>
          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate && onNavigate("instituicoes")}
          >
            <span className="nav-icon">🏢</span>
            <span>Instituições</span>
          </button>
          <button
            type="button"
            className="nav-item"
            onClick={() => onNavigate && onNavigate("notas-fiscais")}
          >
            <span className="nav-icon">🧾</span>
            <span>Notas Fiscais</span>
          </button>
          <button type="button"
          className="nav-item"
          onClick={() => onNavigate?.("relatorios")}>
            <span className="nav-icon">📊</span>
            <span>Relatórios</span>
          </button>
          <button type="button" className="nav-item" onClick={() => onNavigate?.("produtos")}>
            <span className="nav-icon">📦</span>
            <span>Produtos</span>
          </button>
          <button type="button" className="nav-item" onClick={() => onNavigate?.("entregas")}>
            <span className="nav-icon">🚚</span>
            <span>Entregas</span>
          </button>
          <button type="button" className="nav-item" onClick={() => onNavigate?.("dashboard")}>
            <span className="nav-icon">🔔</span>
            <span>Avisos</span>
          </button>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <div className="main-wrapper">
        <main className="dashboard-content">
          <header
            className="dashboard-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h1>Dashboard</h1>
              <p>
                Resumo geral da CoopVale{" "}
                {session ? `• Bem-vindo, ${session.name}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              style={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Sair
            </button>
          </header>

          {summaryError && (
            <p role="alert" className="dashboard-error">
              {summaryError}
            </p>
          )}

          {/* Cards Superiores */}
          <section className="metrics-grid">
            <div className="metric-card border-green">
              <div className="metric-header">
                <span className="metric-icon">📄</span>
              </div>
              <span className="metric-title">Contratos ativos</span>
              <div className="metric-value">
                {summary ? summary.finance.open_contracts_count : "—"}
              </div>
              <span className="metric-subtext">Não concluídos</span>
            </div>

            <div className="metric-card border-yellow">
              <div className="metric-header">
                <span className="metric-icon">🚚</span>
              </div>
              <span className="metric-title">Entregas da semana</span>
              <div className="metric-value">
                {summary ? summary.deliveries.total_count : "—"}
              </div>
              <a href="#entregas" className="metric-link text-yellow">
                Ver entregas
              </a>
            </div>

            <div className="metric-card border-green">
              <div className="metric-header">
                <span className="metric-icon">💲</span>
              </div>
              <span className="metric-title">A receber</span>
              <div className="metric-value">
                {summary
                  ? formatCurrency(summary.finance.open_contracts_receivable_cents)
                  : "—"}
              </div>
              <span className="metric-subtext">Contratos em aberto</span>
            </div>

            <div className="metric-card border-yellow">
              <div className="metric-header">
                <span className="metric-icon">📅</span>
              </div>
              <span className="metric-title">
                Contratos próximos do limite
              </span>
              <div className="metric-value">
                {summary ? summary.contracts_near_limit.length : "—"}
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("contratos")}
                className="metric-link text-yellow"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                Ver contratos
              </button>
            </div>

            <div className="metric-card border-green">
              <div className="metric-header">
                <span className="metric-icon">⚠️</span>
              </div>
              <span className="metric-title">Alertas pendentes</span>
              <div className="metric-value">
                {summary ? summary.alerts.length : "—"}
              </div>
              <a href="#alertas" className="metric-link text-green">
                Ver alertas
              </a>
            </div>
          </section>

          {/* Seção do Meio: Tabela e Resumo Financeiro */}
          <section className="dashboard-middle-grid">
            {/* Tabela de Entregas */}
            <div className="panel-card" id="entregas">
              <div className="panel-header">
                <h2>
                  <span className="panel-header-icon">📅</span> Entregas na
                  semana
                </h2>
              </div>
              <div className="table-wrapper">
                <table className="deliveries-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Quantidade de entregas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.deliveries.by_day.map((day) => (
                      <tr key={day.date}>
                        <td className="font-bold">{formatDate(day.date)}</td>
                        <td>{day.count}</td>
                      </tr>
                    ))}
                    {!summary && !summaryError && (
                      <tr><td colSpan="2">Carregando entregas...</td></tr>
                    )}
                    {summary && summary.deliveries.by_day.length === 0 && (
                      <tr><td colSpan="2">Nenhuma entrega nesta semana.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="panel-card">
              <div className="panel-header space-between">
                <h2>Resumo financeiro</h2>
                <button
                  type="button"
                  className="link-details"
                  onClick={() => onNavigate && onNavigate("financeiro")}
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  Ver detalhes
                </button>
              </div>

              <div className="financial-content">
                <div className="financial-stats">
                  <div className="stat-group">
                    <span className="stat-label">Entregue nesta semana</span>
                    <span className="stat-value">
                      {summary
                        ? formatCurrency(summary.finance.week_delivered_cents)
                        : "—"}
                    </span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label">Contratos em aberto</span>
                    <span className="stat-value">
                      {summary ? summary.finance.open_contracts_count : "—"}
                    </span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label">A receber nos contratos em aberto</span>
                    <span className="stat-value highlight">
                      {summary
                        ? formatCurrency(summary.finance.open_contracts_receivable_cents)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-bottom-grid">
            <div className="panel-card bottom-panel" id="alertas">
              <h2>Alertas</h2>
              <div className="dashboard-list">
                {summary?.alerts.map((alert, index) => (
                  <div className="dashboard-list-row" key={`${alert.contract_id}-${alert.kind}-${index}`}>
                    <span className={`status-badge ${alert.severity === "Critical" ? "status-pending" : "status-confirm"}`}>
                      {alert.severity === "Critical" ? "Crítico" : "Atenção"}
                    </span>
                    <span>{alert.message}</span>
                  </div>
                ))}
                {summary && summary.alerts.length === 0 && (
                  <p className="dashboard-empty">Nenhum alerta pendente.</p>
                )}
              </div>
            </div>

            <div className="panel-card bottom-panel">
              <div className="panel-header space-between">
                <h2>Contratos próximos do limite</h2>
                <button
                  type="button"
                  className="link-details"
                  onClick={() => onNavigate && onNavigate("contratos")}
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  Ver contratos
                </button>
              </div>
              <div className="dashboard-list">
                {summary?.contracts_near_limit.map((contract) => (
                  <div className="dashboard-list-row" key={contract.contract_id}>
                    <strong>{contract.institution_name}</strong>
                    <span>{contract.remaining_percent}% restante</span>
                    <span>{formatCurrency(contract.remaining_value_cents)}</span>
                  </div>
                ))}
                {summary && summary.contracts_near_limit.length === 0 && (
                  <p className="dashboard-empty">Nenhum contrato próximo do limite.</p>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Rodapé */}
        <footer className="footer-bar">
          <div>© 2026 CoopVale. Todos os direitos reservados.</div>
          <div>
            CoopVale - Cooperativa dos Agricultores Familiares do Vale do
            Forquilha
          </div>
          <div>Versão 1.0.0</div>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;