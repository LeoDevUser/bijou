export interface LabelView {
  id: number;
  nameEn: string | null;
  nameFr: string | null;
  nameEs: string | null;
}

export interface ItemAssetView {
  id: number;
  imageUrl: string | null;
  imageId: string | null;
  resourceType: string;
}

export interface CategoryView {
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
  category: CategoryView;
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionEs: string | null;
  assets: ItemAssetView[];
  discountPercent: number | null;
  material: JewelryMaterial | null;
  usmcaQualified: boolean;
}

export interface ItemViewVerbose extends ItemView {
  nbSold: number;
  nbSoldMonth: number;
  totalSales: number;
  totalSalesWeek: number;
  totalSalesMonth: number;
  totalSalesQuarter: number;
  totalSalesYear: number;
  active: boolean;
}

export interface SalesStats {
  total: number;
  week: number;
  month: number;
  quarter: number;
  year: number;
  ordersTotal: number;
  ordersWeek: number;
  ordersMonth: number;
  ordersQuarter: number;
  ordersYear: number;
}

export interface OrderItemView {
  itemId: number;
  unitPrice: number;
  quantity: number;
  nameEn: string | null;
  nameFr: string | null;
  nameEs: string | null;
  imageUrl: string | null;
  resourceType: string;
  active: boolean;
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
  addressLine1: string;
  addressLine2: string | null;
  colonial: string | null;
  city: string;
  state: string;
  postalCode: string;
  email: string;
  firstName: string;
  lastName: string;
  items: OrderItemView[];
  tracking: string | null;
  total: number;
  createdAt: string;
  status: OrderStatus;
  country: Country;
  installments: number | null;
  oxxo: boolean;
  bankTransfer: boolean;
  dutyAmount: number | null;
  taxAmount: number | null;
  handlingFee: number | null;
  facturaUrl: string | null;
}

export type JewelryMaterial = 'SILVER' | 'GOLD' | 'STEEL' | 'OTHER';

export interface ItemRequest {
  nameEn: string;
  nameFr: string;
  nameEs: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs: string;
  price: number;
  stock: number;
  categoryId: number;
  labelIds: number[];
  discountPercent: number | null;
  material: JewelryMaterial;
  usmcaQualified: boolean;
}

export interface VerboseClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  addressLine1: string;
  addressLine2: string | null;
  colonial: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  language: string;
  createdOn: string;
  role: string;
  stripeCustomerId: string | null;
  nbSuccessfulOrders: number;
  moneySpent: number;
}

export interface TaxPreview {
  subtotal: number;
  dutyAmount: number;
  taxAmount: number;
  handlingFee: number;
  total: number;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  resourceType?: string;
}

export interface AnnouncementView {
  id: number;
  textEn: string | null;
  textFr: string | null;
  textEs: string | null;
  active: boolean;
  sortOrder: number;
  ctaCategory: string | null;
  ctaLabelId: number | null;
  ctaCollectionId: number | null;
}

export interface CollectionSiteAssetView {
  id: number;
  slot: string;
  imageUrl: string | null;
  imageId: string | null;
  resourceType: string;
  headerEn: string | null;
  headerFr: string | null;
  headerEs: string | null;
  subheaderEn: string | null;
  subheaderFr: string | null;
  subheaderEs: string | null;
  color: string | null;
  ctaCategory: string | null;
  ctaLabelId: number | null;
}

export interface CollectionThemeView {
  navbarBg: string | null;
  navbarText: string | null;
  navbarTextSelected: string | null;
  navbarTextInactive: string | null;
  announcementBg: string | null;
  announcementText: string | null;
  siteBg: string | null;
  siteText: string | null;
  cardText: string | null;
  cardButtonBg: string | null;
  cardButtonText: string | null;
  navbarSeparator: string | null;
  siteTextMuted: string | null;
  siteTextAccent: string | null;
  siteSeparator: string | null;
}

export interface CollectionView {
  id: number;
  labels: LabelView[];
  imageUrl: string | null;
  imageId: string | null;
  resourceType: string;
  headerEn: string | null;
  headerFr: string | null;
  headerEs: string | null;
  subheaderEn: string | null;
  subheaderFr: string | null;
  subheaderEs: string | null;
  color: string | null;
  siteAssets: CollectionSiteAssetView[];
  theme: CollectionThemeView | null;
}

export interface ThemeConfig {
  navbarBg: string;
  navbarText: string;
  navbarTextSelected: string;
  navbarTextInactive: string;
  announcementBg: string;
  announcementText: string;
  siteBg: string;
  siteText: string;
  cardText: string;
  cardButtonBg: string;
  cardButtonText: string;
  navbarSeparator: string | null;
  siteTextMuted: string | null;
  siteTextAccent: string | null;
  siteSeparator: string | null;
}

export interface AppSettings {
  smtpRelayEnabled: boolean;
  disabledReason: string | null;
}

export interface BrevoQuota {
  sentToday: number;
  remaining: number;
  dailyLimit: number;
}

export interface SiteAssetView {
  id: number;
  slot: string;
  imageUrl: string | null;
  imageId: string | null;
  resourceType: string;
  headerEn: string | null;
  headerFr: string | null;
  headerEs: string | null;
  subheaderEn: string | null;
  subheaderFr: string | null;
  subheaderEs: string | null;
  color: string | null;
  ctaCategory: string | null;
  ctaLabelId: number | null;
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
