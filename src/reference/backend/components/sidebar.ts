import { icon } from "./icons";
import type { Session } from "../types/backend";
import { escapeHtml } from "../utils/format";

const navigation = [
  ["Início", "home"],
  ["Contratos / Chamadas", "file"],
  ["Financeiro", "wallet"],
  ["Notas Fiscais", "receipt"],
  ["Relatórios", "chart"],
  ["Produtos", "box"],
  ["Entregas", "truck"],
  ["Avisos", "bell"],
  ["Configurações", "gear"],
];

export function renderSidebar(session: Session): string {
  return `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="CoopVale, página inicial">
        <span class="brand-mark" aria-hidden="true"><span>✦</span></span>
        <span class="brand-name">Coopvale</span>
        <span class="brand-caption">ValeGestão</span>
      </a>
      <button class="sidebar-toggle" aria-label="Recolher menu">☰</button>
      <nav class="navigation" aria-label="Navegação principal">
        ${navigation
          .map(
            ([label, symbol]) => `
              <button class="nav-link ${label === "Entregas" ? "active" : ""}" ${label === "Entregas" ? 'aria-current="page"' : ""}>
                <span class="nav-icon">${icon(symbol)}</span><span>${label}</span>
              </button>`,
          )
          .join("")}
      </nav>
      <div class="sidebar-user">
        <span class="user-avatar">DV</span>
        <span class="user-copy"><strong>${escapeHtml(session.name)}</strong><small>${escapeHtml(session.email)}</small></span>
        <span class="user-chevron">⌄</span>
      </div>
    </aside>
  `;
}
