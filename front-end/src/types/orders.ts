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
};

export type OrderItem = {
  name: string;
  article: string;
  quantity: number;
  price: number;
  total: number;
  image?: string;
  purchasePrice?: number;
  discount?: number;
  discountedPrice?: number;
};
