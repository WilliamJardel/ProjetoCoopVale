import { invoke } from "@tauri-apps/api/core";
import type {
  BackendDelivery,
  Contract,
  ContractItem,
  DeliveryData,
  Institution,
  Session,
} from "../types/backend";

export const authApi = {
  isAuthenticated: () => invoke<boolean>("is_authenticated"),
  currentSession: () => invoke<Session | null>("current_session"),
  login: (email: string, password: string) =>
    invoke<Session>("login", { email, password }),
  logout: () => invoke<void>("logout"),
};

export const deliveryApi = {
  list: () => invoke<BackendDelivery[]>("list_deliveries"),
  create: (data: DeliveryData) =>
    invoke<BackendDelivery>("create_delivery", { data }),
  update: (id: number, data: DeliveryData) =>
    invoke<BackendDelivery>("update_delivery", { id, data }),
};

export const catalogApi = {
  institutions: () => invoke<Institution[]>("list_institutions"),
  contracts: () => invoke<Contract[]>("list_contracts"),
  contractItems: () => invoke<ContractItem[]>("list_contract_items"),
};
