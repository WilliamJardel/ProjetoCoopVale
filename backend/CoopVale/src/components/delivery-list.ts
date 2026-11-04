import { icon } from "./icons";
import type { Delivery } from "../types/delivery";
import type { Institution } from "../types/backend";
import { escapeHtml, formatDate } from "../utils/format";

function statusClass(status: string): string {
  return status.toLowerCase().replace(/ /g, "-");
}

export function renderDeliveryList(
  deliveries: Delivery[],
  institutions: Institution[],
): string {
  const delivered = deliveries.filter((delivery) => delivery.status === "Entregue").length;
  const quantity = new Set(deliveries.map((delivery) => delivery.product)).size;
  const contracts = new Set(deliveries.map((delivery) => delivery.contract)).size;
  return `
    <main class="page-content">
      <header class="page-heading">
        <div>
          <div class="eyebrow">OPERAÇÃO / LOGÍSTICA</div>
          <h1>Entregas</h1>
          <p>Gerencie as entregas da cooperativa</p>
        </div>
        <button class="button button-primary" data-action="new-delivery">
          ${icon("plus")} Cadastrar entrega
        </button>
      </header>

      <section class="summary-grid" aria-label="Resumo das entregas">
        <article class="summary-card">
          <span class="summary-icon sage">${icon("truck")}</span>
          <div><span class="summary-label">Total de entregas</span><strong>${deliveries.length}</strong><small class="trend">Entregas registradas</small></div>
          <span class="summary-arrow">›</span>
        </article>
        <article class="summary-card">
          <span class="summary-icon gold">${icon("box")}</span>
          <div><span class="summary-label">Produtos entregues</span><strong>${quantity}</strong><small class="trend">Produtos diferentes</small></div>
          <span class="summary-arrow">›</span>
        </article>
        <article class="summary-card">
          <span class="summary-icon lilac">${icon("file")}</span>
          <div><span class="summary-label">Contratos atendidos</span><strong>${contracts}</strong><small class="trend">Contratos com entregas</small></div>
          <span class="summary-arrow">›</span>
        </article>
        <article class="summary-card">
          <span class="summary-icon blue">${icon("wallet")}</span>
          <div><span class="summary-label">Entregas concluídas</span><strong>${delivered}</strong><small class="trend">Quantidade entregue solicitada</small></div>
          <span class="summary-arrow">›</span>
        </article>
      </section>

      <section class="filter-panel" aria-label="Filtros de entregas">
        <label class="filter-field search-field">
          <span>Buscar</span>
          <span class="input-wrap">${icon("search")}<input id="delivery-search" type="search" placeholder="Buscar por número, produto ou instituição" /></span>
        </label>
        <label class="filter-field">
          <span>Período</span><span class="input-wrap">${icon("calendar")}<input id="from-date" type="date" aria-label="Data inicial" /><span class="date-divider">até</span><input id="to-date" type="date" aria-label="Data final" /></span>
        </label>
        <label class="filter-field">
          <span>Instituição / Órgão</span>
          <select id="institution-filter"><option value="">Todas</option>${institutions.map((institution) => `<option value="${institution.id}">${escapeHtml(institution.name)}</option>`).join("")}</select>
        </label>
        <label class="filter-field status-filter">
          <span>Status</span>
          <select id="status-filter"><option value="">Todos</option><option value="Pendente">Pendente</option><option value="Entregue">Entregue</option></select>
        </label>
        <button class="button button-filter" id="apply-filters">${icon("filter")} Aplicar filtros</button>
      </section>

      <section class="table-panel">
        <div class="table-heading">
          <div><span class="table-heading-icon">${icon("calendar")}</span><h2>Entregas realizadas</h2></div>
          <button class="subtle-button" id="clear-filters">Limpar filtros</button>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Número</th><th>Data da entrega</th><th>Contrato</th><th>Instituição</th><th>Produtos</th><th>Quantidade</th><th>Status</th><th class="actions-heading">Ações</th></tr></thead>
            <tbody id="delivery-rows">
              ${deliveries
                .map(
                  (delivery) => `
                    <tr data-id="${delivery.id}">
                      <td class="delivery-number">${escapeHtml(delivery.displayId)}</td>
                      <td>${formatDate(delivery.date)}</td>
                      <td>${escapeHtml(delivery.contract)}</td>
                      <td>${escapeHtml(delivery.institution)}</td>
                      <td>${escapeHtml(delivery.product)}</td>
                      <td>${delivery.deliveredQuantity} ${escapeHtml(delivery.unit)}</td>
                      <td><span class="status-badge status-${statusClass(delivery.status)}"><i></i>${delivery.status}</span></td>
                      <td><div class="row-actions"><button class="icon-button" data-action="view-delivery" aria-label="Ver entrega ${escapeHtml(delivery.displayId)}">${icon("eye")}</button><button class="icon-button" data-action="row-menu" aria-label="Mais opções">${icon("more")}</button></div></td>
                    </tr>`,
                )
                .join("")}
            </tbody>
          </table>
          <div class="empty-state" id="empty-state" hidden>Nenhuma entrega encontrada para os filtros selecionados.</div>
        </div>
        <footer class="table-footer"><span id="results-count">Mostrando ${deliveries.length} entregas</span><nav class="pagination" aria-label="Paginação"><button aria-label="Página anterior">‹</button><button class="current-page" aria-current="page">1</button><button aria-label="Próxima página">›</button></nav></footer>
      </section>
      <div class="screen-note">${delivered} entregas concluídas</div>
    </main>
  `;
}
