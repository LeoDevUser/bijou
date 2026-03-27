export interface LabelView {
  id: number;
  nameEn: string | null;
  nameFr: string | null;
  nameEs: string | null;
}

export interface ItemView {
  id: number;
  stock: number;
  nameEn: string | null;
  nameFr: string | null;
  nameEs: string | null;
  price: number;
  labels: LabelView[];
  category: string;
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionEs: string | null;
  imageUrl: string | null;
  imageId: string | null;
}

export interface ItemViewVerbose extends ItemView {
  nbSold: number;
  totalSales: number;
  active: boolean;
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
  nameEn: string;
  nameFr: string;
  nameEs: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs: string;
  price: number;
  stock: number;
  category: Category;
  labelIds: number[];
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

export interface AnnouncementView {
  id: number;
  textEn: string | null;
  textFr: string | null;
  textEs: string | null;
  active: boolean;
  sortOrder: number;
}

/** Pick the best available translation for the current locale, falling back to any non-null value. */
export function pickLocale(
  en: string | null | undefined,
  fr: string | null | undefined,
  es: string | null | undefined,
  lang: string
): string {
  if (lang === 'fr') return fr || en || es || '';
  if (lang === 'es') return es || en || fr || '';
  return en || fr || es || '';
}

/** Returns true if any language variant is missing for an item. */
export function isItemIncomplete(item: ItemView): boolean {
  return [item.nameEn, item.nameFr, item.nameEs, item.descriptionEn, item.descriptionFr, item.descriptionEs]
    .some(v => !v);
}

/** Returns true if any language variant is missing for a label. */
export function isLabelIncomplete(label: LabelView): boolean {
  return !label.nameEn || !label.nameFr || !label.nameEs;
}
