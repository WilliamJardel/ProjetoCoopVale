export interface Session {
  user_id: number;
  name: string;
  email: string;
  logged_in_at: string;
}

export interface Institution {
  id: number | null;
  name: string;
  cnpj: string;
  institution_type: "Publica" | "Privada";
  telephone: string | null;
  location: string | null;
}

export interface Product {
  id: number;
  name: string;
  measurement_unit: string;
  category: string;
  reference_price_cents: number;
  status: "Ativo" | "Desativado";
}

export interface ContractItem {
  id: number;
  contract_id: number | null;
  product: Product;
  item_qtd: number;
  delivered_qtd: number;
  unit_price: number;
}

export interface Contract {
  id: number;
  institution_id: number;
  total_value_cents: number;
  start_date: string;
  end_date: string;
  status: "EmAndamento" | "QuaseFinalizando" | "Concluido";
}

export interface BackendDelivery {
  id: number;
  contract_item: ContractItem;
  solicited_quantity: number;
  delivered_qtd: number;
  delivery_date: string;
  note: string;
  status: "Pendente" | "Entregue";
  contract: Contract;
}

export interface DeliveryData {
  contract_item_id: number;
  solicited_quantity: number;
  delivered_qtd: number;
  delivery_date: string;
  note: string;
  status: "Pendente" | "Entregue";
}
