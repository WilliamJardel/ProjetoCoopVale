export type DeliveryStatus = "Pendente" | "Entregue";

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
