import type { Contract, ContractItem, Institution } from "../types/backend";
import { escapeHtml } from "../utils/format";
import { icon } from "./icons";

export function renderCreateDelivery(
  contracts: Contract[],
  contractItems: ContractItem[],
  institutions: Institution[],
): string {
  const activeContracts = contracts.filter((contract) => contract.status !== "Concluido");
  const items = contractItems.filter(
    (item) =>
      item.contract_id !== null &&
      activeContracts.some((contract) => contract.id === item.contract_id) &&
      item.item_qtd > item.delivered_qtd,
  );
  const institutionNames = new Map(
    institutions.map((institution) => [institution.id, institution.name]),
  );
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

  return `
    <main class="page-content detail-page">
      <button class="back-link" data-action="back-to-list">${icon("arrow")}<span>Entregas</span></button>
      <header class="detail-heading"><h1>Cadastrar entrega</h1></header>
      <div class="notice notice-info">${icon("info")}<span>O cadastro registra a quantidade solicitada e a quantidade entregue no backend.</span></div>
      <form class="detail-card create-form" id="create-delivery-form">
        <label class="filter-field create-field"><span>Item do contrato</span>
          <select name="contract_item_id" required ${items.length ? "" : "disabled"}>
            <option value="">Selecione um produto</option>
            ${items
              .map((item) => {
                const contract = activeContracts.find((entry) => entry.id === item.contract_id);
                const institution = contract
                  ? institutionNames.get(contract.institution_id) ?? `Instituição ${contract.institution_id}`
                  : "";
                const remaining = item.item_qtd - item.delivered_qtd;
                return `<option value="${item.id}" data-remaining="${remaining}">${escapeHtml(item.product.name)} · Contrato ${contract?.id ?? ""} · ${escapeHtml(institution)} · saldo ${remaining} ${escapeHtml(item.product.measurement_unit)}</option>`;
              })
              .join("")}
          </select>
        </label>
        ${items.length ? "" : '<p class="form-empty">Não há itens disponíveis em contratos ativos para cadastrar uma entrega.</p>'}
        <div class="create-fields-grid">
          <label class="filter-field create-field"><span>Data da entrega</span><input name="delivery_date" type="date" value="${localDate}" required /></label>
          <label class="filter-field create-field"><span>Quantidade solicitada</span><input name="solicited_quantity" type="number" min="1" required /></label>
          <label class="filter-field create-field"><span>Quantidade entregue</span><input name="delivered_qtd" type="number" min="1" required /></label>
          <label class="filter-field create-field"><span>Status</span><select name="status" required><option value="" selected disabled>Selecione o status</option><option value="Pendente">Pendente</option><option value="Entregue">Entregue</option></select></label>
        </div>
        <label class="filter-field create-field"><span>Observação</span><textarea name="note" rows="3" maxlength="500" placeholder="Observações sobre a entrega"></textarea></label>
        <div class="detail-actions create-actions"><button class="button button-outline" type="button" data-action="back-to-list">Cancelar</button><button class="button button-primary" type="submit" ${items.length ? "" : "disabled"}>Cadastrar entrega ${icon("check")}</button></div>
      </form>
    </main>
  `;
}
