export type OrderStatus = "Нове" | "В роботі" | "Готово" | "Скасовано";

export type Order = {
  id: string;
  date: string;
  time: string;
  client: string;
  object: string;
  itemCount: number;
  status: OrderStatus;
  items?: OrderItem[];
  total?: number;
  revision?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItem = {
  lineId?: string;
  productId?: number;
  supplier?: string;
  unit?: string;
  name: string;
  article: string;
  quantity: number;
  price: number;
  total: number;
  image?: string;
  purchasePrice?: number | null;
  discount?: number;
  discountedPrice?: number;
};

export type CreateOrderInput = { client: string; address: string; items: OrderItem[]; total?: number };
export type UpdateOrderInput = { client: string; address: string; status: OrderStatus; items: OrderItem[]; revision: number };
