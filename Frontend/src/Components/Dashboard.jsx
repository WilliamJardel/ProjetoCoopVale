import React from "react";
import "../Styles/dashboard.css";
import { useAuth } from "../context/AuthContext";

function Dashboard({ onNavigate }) {
  const { session, logout } = useAuth();

  const deliveries = [
    {
      contract: "CP 09/2026",
      institution: "PNAE - Quixadá",
      product: "Polpa de fruta",
      date: "25/09/2026",
      status: "Pendente",
      statusClass: "status-pending",
    },
    {
      contract: "CP 08/2026",
      institution: "PNAE - Banabuiú",
      product: "Polpa de fruta",
      date: "28/08/2026",
      status: "A confirmar",
      statusClass: "status-confirm",
    },
    {
      contract: "CP 07/2026",
      institution: "PNAE - Ibaretama",
      product: "Polpa de fruta",
      date: "14/07/2026",
      status: "Confirmado",
      statusClass: "status-done",
    },
    {
      contract: "CP 06/2026",
      institution: "PNAE - Senador P.",
      product: "Polpa de fruta",
      date: "10/06/2026",
      status: "Confirmado",
      statusClass: "status-done",
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar Lateral */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src="C:\Users\João Hélio\Documents\ProjetoCoopVale\ProjetoCoopVale\Frontend\src\public\img\iconCoopVale.png"
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
          <button type="button" className="nav-item">
            <span className="nav-icon">💲</span>
            <span>Financeiro</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">🧾</span>
            <span>Notas Fiscais</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Relatórios</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">📦</span>
            <span>Produtos</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">🚚</span>
            <span>Entregas</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">🔔</span>
            <span>Avisos</span>
          </button>
          <button type="button" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Configurações</span>
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

          {/* Cards Superiores */}
          <section className="metrics-grid">
            <div className="metric-card border-green">
              <div className="metric-header">
                <span className="metric-icon">📄</span>
              </div>
              <span className="metric-title">Contratos ativos</span>
              <div className="metric-value">8</div>
              <span className="metric-subtext positive">
                +2 desde o mês passado
              </span>
            </div>

            <div className="metric-card border-yellow">
              <div className="metric-header">
                <span className="metric-icon">🚚</span>
              </div>
              <span className="metric-title">Entregas da semana</span>
              <div className="metric-value">12</div>
              <a href="#entregas" className="metric-link text-yellow">
                Ver entregas
              </a>
            </div>

            <div className="metric-card border-green">
              <div className="metric-header">
                <span className="metric-icon">💲</span>
              </div>
              <span className="metric-title">A receber</span>
              <div className="metric-value">R$ 2.700,00</div>
              <span className="metric-subtext">Total pendente</span>
            </div>

            <div className="metric-card border-yellow">
              <div className="metric-header">
                <span className="metric-icon">📅</span>
              </div>
              <span className="metric-title">
                Contratos próximos do limite
              </span>
              <div className="metric-value">2</div>
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
              <div className="metric-value">5</div>
              <a href="#alertas" className="metric-link text-green">
                Ver alertas
              </a>
            </div>
          </section>

          {/* Seção do Meio: Tabela e Resumo Financeiro */}
          <section className="dashboard-middle-grid">
            {/* Tabela de Entregas */}
            <div className="panel-card">
              <div className="panel-header">
                <h2>
                  <span className="panel-header-icon">📅</span> Entregas
                  próximas
                </h2>
              </div>
              <div className="table-wrapper">
                <table className="deliveries-table">
                  <thead>
                    <tr>
                      <th>Contrato</th>
                      <th>Instituição</th>
                      <th>Produto</th>
                      <th>Data de Entrega</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((item, index) => (
                      <tr key={index}>
                        <td className="font-bold">{item.contract}</td>
                        <td>{item.institution}</td>
                        <td>{item.product}</td>
                        <td>{item.date}</td>
                        <td>
                          <span
                            className={`status-badge ${item.statusClass}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="panel-card">
              <div className="panel-header space-between">
                <h2>Resumo financeiro (mês)</h2>
                <a href="#financeiro" className="link-details">
                  Ver detalhes
                </a>
              </div>

              <div className="financial-content">
                <div className="financial-stats">
                  <div className="stat-group">
                    <span className="stat-label">Valor contratado</span>
                    <span className="stat-value">R$ 15.850,00</span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label">Valor entregue</span>
                    <span className="stat-value">R$ 13.200,00</span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label">Valor recebido</span>
                    <span className="stat-value">R$ 10.500,00</span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label">A receber</span>
                    <span className="stat-value highlight">R$ 2.700,00</span>
                  </div>
                </div>

                {/* Placeholder do Gráfico Donut */}
                <div className="chart-placeholder">
                  <svg viewBox="0 0 36 36" className="donut-chart">
                    <path
                      className="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#ffcc00"
                      strokeWidth="6"
                    />
                    <path
                      className="circle-val"
                      strokeDasharray="80, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#008a43"
                      strokeWidth="6"
                    />
                  </svg>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <span className="dot dot-green"></span>
                      <span>Recebido</span>
                      <span className="legend-val">R$ 10.500,00</span>
                    </div>
                    <div className="legend-item">
                      <span className="dot dot-yellow"></span>
                      <span>A receber</span>
                      <span className="legend-val">R$ 2.700,00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Seção Inferior: Contratos por Situação */}
          <section className="panel-card bottom-panel">
            <h2>Contratos por situação</h2>

            <div className="bottom-chart-grid">
              {/* Placeholder pro Gráfico Bottom */}
              <div className="donut-placeholder-bottom">
                <svg viewBox="0 0 36 36" className="donut-chart-bottom">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#588e38"
                    strokeWidth="6"
                    strokeDasharray="61.5, 100"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f4c430"
                    strokeWidth="6"
                    strokeDasharray="23.1, 100"
                    strokeDashoffset="-61.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e65100"
                    strokeWidth="6"
                    strokeDasharray="7.7, 100"
                    strokeDashoffset="-84.6"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f0a07e"
                    strokeWidth="6"
                    strokeDasharray="7.7, 100"
                    strokeDashoffset="-92.3"
                  />
                </svg>
                <div className="donut-center-text">
                  <span className="total-label">Total</span>
                  <span className="total-count">13</span>
                  <span className="total-sub">contratos</span>
                </div>
              </div>

              {/* Legenda Lateral com dados */}
              <div className="status-list">
                <div className="status-row">
                  <span className="dot dot-green-dark"></span>
                  <span className="status-name">Ativos</span>
                  <span className="status-count font-bold">8</span>
                  <span className="status-percent">61,5%</span>
                </div>
                <div className="status-row">
                  <span className="dot dot-yellow"></span>
                  <span className="status-name">Próximos do limite</span>
                  <span className="status-count font-bold">3</span>
                  <span className="status-percent">23,1%</span>
                </div>
                <div className="status-row">
                  <span className="dot dot-orange"></span>
                  <span className="status-name">Encerrando</span>
                  <span className="status-count font-bold">1</span>
                  <span className="status-percent">7,7%</span>
                </div>
                <div className="status-row">
                  <span className="dot dot-light-orange"></span>
                  <span className="status-name">Finalizados</span>
                  <span className="status-count font-bold">1</span>
                  <span className="status-percent">7,7%</span>
                </div>
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