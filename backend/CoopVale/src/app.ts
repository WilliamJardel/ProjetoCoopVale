import { renderCreateDelivery } from "./components/create-delivery";
import { renderDeliveryList } from "./components/delivery-list";
import { renderLogin } from "./components/login";
import { renderSidebar } from "./components/sidebar";
import { renderDeliveryDetail } from "./components/delivery-detail";
import { authApi, catalogApi, deliveryApi } from "./services/coopvale";
import type {
  BackendDelivery,
  Contract,
  ContractItem,
  DeliveryData,
  Institution,
  Session,
} from "./types/backend";
import type { Delivery } from "./types/delivery";
import { toDateInput } from "./utils/format";
import "./styles/index.css";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Elemento raiz #app não encontrado.");
const app = root;

let session: Session | null = null;
let deliveries: Delivery[] = [];
let institutions: Institution[] = [];
let contracts: Contract[] = [];
let contractItems: ContractItem[] = [];
let selectedDelivery: Delivery | null = null;
let screen: "list" | "detail" | "create" = "list";
let loginError = "";
let loading = true;

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mapDelivery(
  item: BackendDelivery,
  institutionsById: Map<number, string>,
): Delivery {
  const status = item.delivered_qtd >= item.solicited_quantity ? "Entregue" : "Pendente";
  return {
    id: item.id,
    displayId: `EN ${String(item.id).padStart(6, "0")}`,
    date: item.delivery_date,
    contract: `Contrato ${item.contract.id}`,
    institutionId: item.contract.institution_id,
    institution:
      institutionsById.get(item.contract.institution_id) ??
      `Instituição ${item.contract.institution_id}`,
    product: item.contract_item.product.name,
    unit: item.contract_item.product.measurement_unit,
    quantity: item.solicited_quantity,
    deliveredQuantity: item.delivered_qtd,
    contractItemId: item.contract_item.id,
    note: item.note,
    status,
  };
}

function render(): void {
  if (loading) {
    app.innerHTML = '<main class="startup-state" role="status">Carregando CoopVale…</main>';
    return;
  }
  if (!session) {
    app.innerHTML = renderLogin(loginError);
    return;
  }

  const content =
    screen === "detail" && selectedDelivery
      ? renderDeliveryDetail(selectedDelivery)
      : screen === "create"
        ? renderCreateDelivery(contracts, contractItems, institutions)
        : renderDeliveryList(deliveries, institutions);
  const title = screen === "detail" ? "Editar entrega" : screen === "create" ? "Nova entrega" : "Entregas";
  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(session)}
      <div class="workspace">
        <div class="topbar">
          <span>CoopVale <span class="topbar-separator">/</span> <strong>${title}</strong></span>
          <button class="subtle-button" data-action="logout">Sair</button>
        </div>
        ${content}
        <footer class="app-footer"><span>© 2026 CoopVale. Todos os direitos reservados.</span><span>CoopVale - Cooperativa dos Agricultores Familiares do Vale do Forquilha</span><span>Versão 1.0.0</span></footer>
      </div>
    </div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}

async function loadData(): Promise<void> {
  const [deliveryRows, institutionRows, contractRows, itemRows] = await Promise.all([
    deliveryApi.list(),
    catalogApi.institutions(),
    catalogApi.contracts(),
    catalogApi.contractItems(),
  ]);
  institutions = institutionRows;
  contracts = contractRows;
  contractItems = itemRows;
  const institutionNames = new Map<number, string>();
  for (const institution of institutionRows) {
    if (institution.id !== null) institutionNames.set(institution.id, institution.name);
  }
  deliveries = deliveryRows.map((delivery) => mapDelivery(delivery, institutionNames));
}

async function enterApp(): Promise<void> {
  loading = true;
  render();
  try {
    await loadData();
    screen = "list";
    selectedDelivery = null;
    loginError = "";
  } catch (error) {
    session = null;
    loginError = messageFromError(error);
  } finally {
    loading = false;
    render();
  }
}

function applyFilters(): void {
  const search =
    document
      .querySelector<HTMLInputElement>("#delivery-search")
      ?.value.trim()
      .toLocaleLowerCase("pt-BR") ?? "";
  const institution =
    document.querySelector<HTMLSelectElement>("#institution-filter")?.value ?? "";
  const status = document.querySelector<HTMLSelectElement>("#status-filter")?.value ?? "";
  const fromDate = document.querySelector<HTMLInputElement>("#from-date")?.value ?? "";
  const toDate = document.querySelector<HTMLInputElement>("#to-date")?.value ?? "";
  let visible = 0;
  for (const delivery of deliveries) {
    const row = document.querySelector<HTMLTableRowElement>(`tr[data-id="${delivery.id}"]`);
    if (!row) continue;
    const date = toDateInput(delivery.date);
    const matches =
      (!search ||
        `${delivery.displayId} ${delivery.product} ${delivery.institution}`
          .toLocaleLowerCase("pt-BR")
          .includes(search)) &&
      (!institution || delivery.institutionId === Number(institution)) &&
      (!status || delivery.status === status) &&
      (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate);
    row.hidden = !matches;
    if (matches) visible += 1;
  }
  const count = document.querySelector<HTMLElement>("#results-count");
  if (count) count.textContent = `Mostrando ${visible} de ${deliveries.length} entregas`;
  const emptyState = document.querySelector<HTMLElement>("#empty-state");
  if (emptyState) emptyState.hidden = visible > 0;
}

function showToast(message: string): void {
  const toast = document.querySelector<HTMLElement>("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 4000);
}

async function createDelivery(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const itemId = Number(formData.get("contract_item_id"));
  const requested = Number(formData.get("solicited_quantity"));
  const delivered = Number(formData.get("delivered_qtd"));
  const date = String(formData.get("delivery_date"));
  const item = contractItems.find((contractItem) => contractItem.id === itemId);
  if (!item || !item.contract_id) {
    showToast("Selecione um item válido de contrato.");
    return;
  }
  if (
    !Number.isInteger(requested) ||
    !Number.isInteger(delivered) ||
    requested <= 0 ||
    delivered <= 0 ||
    delivered > requested
  ) {
    showToast("Informe quantidades válidas; a quantidade entregue deve ser maior que zero e não pode superar a solicitada.");
    return;
  }
  const available = item.item_qtd - item.delivered_qtd;
  if (delivered > available) {
    showToast(`A quantidade entregue excede o saldo disponível de ${available} ${item.product.measurement_unit}.`);
    return;
  }
  if (!date) {
    showToast("Informe a data da entrega.");
    return;
  }
  const data: DeliveryData = {
    contract_item_id: itemId,
    solicited_quantity: requested,
    delivered_qtd: delivered,
    delivery_date: date,
    note: String(formData.get("note") ?? ""),
  };
  await deliveryApi.create(data);
  await loadData();
  screen = "list";
  render();
}

async function saveDelivery(): Promise<void> {
  if (!selectedDelivery) return;
  const quantity = document.querySelector<HTMLInputElement>("#actual-quantity");
  const delivered = Number(quantity?.value);
  if (!Number.isInteger(delivered) || delivered <= 0 || delivered > selectedDelivery.quantity) {
    showToast("A quantidade entregue deve ser maior que zero e não pode superar a quantidade solicitada.");
    quantity?.focus();
    return;
  }
  const data: DeliveryData = {
    contract_item_id: selectedDelivery.contractItemId,
    solicited_quantity: selectedDelivery.quantity,
    delivered_qtd: delivered,
    delivery_date: selectedDelivery.date,
    note: selectedDelivery.note,
  };
  await deliveryApi.update(selectedDelivery.id, data);
  await loadData();
  screen = "list";
  selectedDelivery = null;
  render();
}

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id === "login-form") {
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      session = await authApi.login(email, password);
      loginError = "";
      await enterApp();
    } catch (error) {
      loginError = messageFromError(error);
      loading = false;
      render();
    }
    return;
  }
  if (form.id === "create-delivery-form") {
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await createDelivery(form);
    } catch (error) {
      showToast(`Não foi possível cadastrar a entrega: ${messageFromError(error)}`);
    } finally {
      if (submit?.isConnected) submit.disabled = false;
    }
  }
});

app.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (action === "logout") {
    try {
      await authApi.logout();
      session = null;
      deliveries = [];
      institutions = [];
      contracts = [];
      contractItems = [];
      loginError = "";
      render();
    } catch (error) {
      showToast(`Não foi possível sair: ${messageFromError(error)}`);
    }
    return;
  }
  if (action === "back-to-list") {
    screen = "list";
    selectedDelivery = null;
    render();
    return;
  }
  if (action === "new-delivery") {
    screen = "create";
    render();
    return;
  }
  if (action === "view-delivery") {
    const row = target.closest<HTMLTableRowElement>("tr[data-id]");
    selectedDelivery = deliveries.find((item) => item.id === Number(row?.dataset.id)) ?? null;
    if (selectedDelivery) {
      screen = "detail";
      render();
    }
    return;
  }
  if (action === "confirm-delivery") {
    const button = target.closest<HTMLButtonElement>("button");
    if (button) button.disabled = true;
    try {
      await saveDelivery();
    } catch (error) {
      showToast(`Não foi possível salvar a entrega: ${messageFromError(error)}`);
      if (button) button.disabled = false;
    }
    return;
  }
  if (action === "row-menu") showToast("Ações adicionais ainda não estão disponíveis.");
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === "delivery-search") applyFilters();
  if (target instanceof HTMLInputElement && target.id === "actual-quantity" && selectedDelivery) {
    const quantity = Number(target.value);
    const loss = document.querySelector<HTMLElement>("#loss-value");
    if (loss) {
      loss.textContent = `${Math.max(0, selectedDelivery.quantity - (Number.isFinite(quantity) ? quantity : 0))} ${selectedDelivery.unit}`;
    }
  }
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "date")) {
    applyFilters();
  }
  if (target instanceof HTMLSelectElement && target.name === "contract_item_id") {
    const item = contractItems.find((contractItem) => contractItem.id === Number(target.value));
    const requested = document.querySelector<HTMLInputElement>('input[name="solicited_quantity"]');
    const delivered = document.querySelector<HTMLInputElement>('input[name="delivered_qtd"]');
    if (item && requested && delivered) {
      const available = item.item_qtd - item.delivered_qtd;
      requested.max = String(available);
      requested.value = String(available);
      delivered.max = String(available);
      delivered.value = String(available);
    }
  }
});

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#apply-filters")) applyFilters();
  if (target.closest("#clear-filters")) {
    const search = document.querySelector<HTMLInputElement>("#delivery-search");
    const institution = document.querySelector<HTMLSelectElement>("#institution-filter");
    const status = document.querySelector<HTMLSelectElement>("#status-filter");
    const fromDate = document.querySelector<HTMLInputElement>("#from-date");
    const toDate = document.querySelector<HTMLInputElement>("#to-date");
    if (search) search.value = "";
    if (institution) institution.value = "";
    if (status) status.value = "";
    if (fromDate) fromDate.value = "";
    if (toDate) toDate.value = "";
    applyFilters();
  }
});

async function start(): Promise<void> {
  render();
  try {
    if (await authApi.isAuthenticated()) {
      session = await authApi.currentSession();
      if (session) {
        await enterApp();
        return;
      }
    }
    loading = false;
    render();
  } catch (error) {
    loading = false;
    loginError = `Não foi possível verificar a sessão: ${messageFromError(error)}`;
    render();
  }
}

void start();
