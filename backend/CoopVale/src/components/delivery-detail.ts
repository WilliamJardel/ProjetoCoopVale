import type { Delivery } from "../types/delivery";
import { escapeHtml, formatDate } from "../utils/format";
import { icon } from "./icons";

export function renderDeliveryDetail(delivery: Delivery): string {
  return `
    <main class="page-content detail-page">
      <button class="back-link" data-action="back-to-list">${icon("arrow")}<span>Entregas</span></button>
      <header class="detail-heading"><h1>Atualizar entrega</h1></header>

      <div class="detail-layout">
        <div class="detail-main">
          <section class="detail-card">
            <h2>Dados da entrega</h2>
            <div class="delivery-facts">
              <div><span>Nº da entrega</span><strong>${escapeHtml(delivery.displayId)}</strong></div>
              <div><span>Produto</span><strong>${escapeHtml(delivery.product)}</strong></div>
              <div><span>Data de entrega</span><strong>${formatDate(delivery.date)}</strong></div>
              <div><span>Instituição / Órgão</span><strong>${escapeHtml(delivery.institution)}</strong></div>
              <div><span>Contrato</span><strong>${escapeHtml(delivery.contract)}</strong></div>
              <div><span>Quantidade solicitada</span><strong>${delivery.quantity} ${escapeHtml(delivery.unit)}</strong></div>
            </div>
          </section>

          <section class="detail-card quantity-card">
            <h2>Quantidade entregue</h2>
            <div class="quantity-table">
              <div class="quantity-row quantity-header"><strong>Produto</strong><strong>Quantidade solicitada</strong><strong>Quantidade entregue</strong></div>
              <div class="quantity-row"><span>${escapeHtml(delivery.product)}</span><span>${delivery.quantity} ${escapeHtml(delivery.unit)}</span><label class="quantity-input"><input id="actual-quantity" type="number" min="1" max="${delivery.quantity}" value="${Math.max(1, delivery.deliveredQuantity)}" aria-label="Quantidade entregue" /><span>${escapeHtml(delivery.unit)}</span></label></div>
            </div>
            <div class="loss-total">${icon("receipt")}<strong>Quantidade pendente</strong><strong id="loss-value">${Math.max(0, delivery.quantity - delivery.deliveredQuantity)} ${escapeHtml(delivery.unit)}</strong></div>
          </section>
        </div>
      </div>

      <div class="detail-actions"><button class="button button-outline" data-action="back-to-list">Cancelar</button><button class="button button-primary" data-action="confirm-delivery">Salvar alterações ${icon("check")}</button></div>
    </main>
  `;
}
