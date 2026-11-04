export type DeliveryStatus =
  | "Pendente"
  | "Aguardando conferência"
  | "Em transporte"
  | "Entregue";

export interface Delivery {
  id: number;
  displayId: string;
  date: string;
  contract: string;
  institutionId: number;
  institution: string;
  product: string;
  unit: string;
  quantity: number;
  deliveredQuantity: number;
  contractItemId: number;
  note: string;
  status: DeliveryStatus;
}
