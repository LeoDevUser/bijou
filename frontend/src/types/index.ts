export interface ItemView {
  id: number;
  stock: number;
  name: string;
  price: number;
  labels: string[];
  category: string;
  description: string;
  imageUrl: string | null;
  imageId: string | null;
}

export interface OrderItemView {
  itemId: number;
  unitPrice: number;
  quantity: number;
}

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type Country = 'CANADA' | 'UNITED_STATES' | 'MEXICO';
export type Currency = 'CAD' | 'USD' | 'MXN';

export interface OrderView {
  id: number;
  address: string;
  email: string;
  firstName: string;
  lastName: string;
  items: OrderItemView[];
  tracking: string | null;
  total: number;
  createdAt: string;
  status: OrderStatus;
  country: Country;
}

export type Category = 'NECKLACE' | 'RING' | 'EARRING' | 'MISC';

export interface ItemRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: Category;
  labels: string[];
}

export interface VerboseClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  createdOn: string;
  role: string;
  stripeCustomerId: string | null;
  nbSuccessfulOrders: number;
  moneySpent: number;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}
