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

export interface ItemSizeView {
  id: number;
  /** Label per language; at least one is filled, the rest fall back via pickLocale. */
  sizeEn: string | null;
  sizeFr: string | null;
  sizeEs: string | null;
  stock: number;
  version: number;
  weightGrams: number;
  price: number;
  pricingWork: number | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionEs: string | null;
  sortOrder: number;
  active: boolean;
  /** Media for this size alone. Empty means it shows the item's own gallery. */
  assets: ItemAssetView[];
}

export interface ItemView {
  id: number;
  stock: number;
  version: number;
  nameEn: string | null;
  nameFr: string | null;
  nameEs: string | null;
  /** Net price — the taxable base. IVA is added per order at checkout. */
  price: number;
  /** The admin typed this item's static prices with IVA already applied. */
  priceIncludesTax: boolean;
  labels: LabelView[];
  categories: CategoryView[];
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionEs: string | null;
  assets: ItemAssetView[];
  sizes: ItemSizeView[];
  discountPercent: number | null;
  material: JewelryMaterial | null;
  usmcaQualified: boolean;
  weightGrams: number;
  pricingFormula: PricingFormula | null;
  pricingWork: number | null;
  pricingMargin: number | null;
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
  taxTotal: number;
  taxWeek: number;
  taxMonth: number;
  taxQuarter: number;
  taxYear: number;
}

export interface MaterialBucket {
  grams: number;
  money: number;
  units: number;
}

export interface MaterialSalesStats {
  gold10k: MaterialBucket;
  gold14k: MaterialBucket;
  silver: MaterialBucket;
  steel: MaterialBucket;
  other: MaterialBucket;
}

export interface OrderItemView {
  itemId: number;
  sizeLabel: string | null;
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
  shippingFee: number | null;
  facturaUrl: string | null;
  facturaRequested: boolean;
  cfdiUso: string | null;
  rfc: string | null;
  regimenFiscal: string | null;
}

export interface CfdiUsoOption {
  code: string;
  description: string;
}

export interface RegimenFiscalOption {
  name: string;
  code: string;
  description: string;
  fisica: boolean;
  moral: boolean;
  usos: string[];
}

export interface FiscalCatalog {
  regimenes: RegimenFiscalOption[];
  usos: CfdiUsoOption[];
}

export type JewelryMaterial = 'SILVER' | 'GOLD' | 'STEEL' | 'OTHER';

export type PricingFormula = 'NONE' | 'GOLD_10K' | 'GOLD_14K' | 'SILVER_925';

export interface ItemRequest {
  nameEn: string;
  nameFr: string;
  nameEs: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs: string;
  /** Sent as typed; the backend strips IVA when priceIncludesTax is set. */
  price: number;
  priceIncludesTax: boolean;
  stock: number;
  categoryIds: number[];
  labelIds: number[];
  discountPercent: number | null;
  material: JewelryMaterial;
  usmcaQualified: boolean;
  weightGrams: number;
  pricingFormula: PricingFormula | null;
  pricingWork: number | null;
  pricingMargin: number | null;
}

export interface ItemSizeRequest {
  sizeEn: string | null;
  sizeFr: string | null;
  sizeEs: string | null;
  stock: number;
  weightGrams: number;
  price: number | null;
  pricingWork: number | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionEs: string | null;
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
  rfc: string | null;
  regimenFiscal: string | null;
}

export interface TaxPreview {
  subtotal: number;
  dutyAmount: number;
  taxAmount: number;
  handlingFee: number;
  shippingFee: number;
  total: number;
  /**
   * IVA on the cart's gold pieces — what requesting a factura saves, or what it
   * already saved when one is requested. Zero when the cart holds no gold.
   */
  goldIvaWaivable: number;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  resourceType?: string;
  sizeId?: number | null;
  sizeLabel?: string | null;
}

export interface AnnouncementView {
  id: number;
  textEn: string | null;
  textFr: string | null;
  textEs: string | null;
  active: boolean;
  sortOrder: number;
  ctaCategoryIds: number[];
  ctaLabelIds: number[];
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
  taglineEn: string | null;
  taglineFr: string | null;
  taglineEs: string | null;
  /** Fallback colour for any text in this slot without a colour of its own. */
  baseTextColor: string | null;
  headerTextColor: string | null;
  subheaderTextColor: string | null;
  taglineTextColor: string | null;
  /** CTA button, resting state. Null falls back to the slot's text colour / transparent. */
  ctaTextColor: string | null;
  ctaBorderColor: string | null;
  ctaBgColor: string | null;
  /** CTA button, hover state. Null keeps the resting colour; all three null = fade to 75%. */
  ctaHoverTextColor: string | null;
  ctaHoverBorderColor: string | null;
  ctaHoverBgColor: string | null;
  /** Heading the shop page shows when a shopper arrives through this CTA. */
  ctaTitleEn: string | null;
  ctaTitleFr: string | null;
  ctaTitleEs: string | null;
  /**
   * Centre of the slot's text block as a percentage of the panel, or null for the
   * centred default. The mobile pair falls back to the desktop one.
   */
  textPosX: number | null;
  textPosY: number | null;
  textPosXMobile: number | null;
  textPosYMobile: number | null;
  ctaCategoryIds: number[];
  ctaLabelIds: number[];
  ctaCollectionIds: number[];
}

export interface CollectionAssetRequest {
  headerEn: string;
  headerFr: string;
  headerEs: string;
  subheaderEn: string;
  subheaderFr: string;
  subheaderEs: string;
  taglineEn: string | null;
  taglineFr: string | null;
  taglineEs: string | null;
  baseTextColor: string | null;
  headerTextColor: string | null;
  subheaderTextColor: string | null;
  taglineTextColor: string | null;
  ctaTextColor: string | null;
  ctaBorderColor: string | null;
  ctaBgColor: string | null;
  ctaHoverTextColor: string | null;
  ctaHoverBorderColor: string | null;
  ctaHoverBgColor: string | null;
  /** Heading the shop page shows when a shopper arrives through this CTA. */
  ctaTitleEn: string | null;
  ctaTitleFr: string | null;
  ctaTitleEs: string | null;
  textPosX: number | null;
  textPosY: number | null;
  textPosXMobile: number | null;
  textPosYMobile: number | null;
  ctaCategoryIds: number[];
  ctaLabelIds: number[];
  ctaCollectionIds: number[];
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
  categories: CategoryView[];
  imageUrl: string | null;
  imageId: string | null;
  resourceType: string;
  headerEn: string | null;
  headerFr: string | null;
  headerEs: string | null;
  subheaderEn: string | null;
  subheaderFr: string | null;
  subheaderEs: string | null;
  /** Default text colour for this collection's card on the collections grid. */
  cardTextColor: string | null;
  siteAssets: CollectionSiteAssetView[];
  theme: CollectionThemeView | null;
  active: boolean;
  isMain: boolean;
  /** Parent collection when this one is a subcollection; null when top-level. */
  parentId: number | null;
  /** Display order among siblings. */
  sortOrder: number;
  /** Nesting level — 0 for top-level. Only meaningful in the flat admin listing. */
  depth: number;
  /** Direct, active subcollections. Populated on single-collection reads and the public index. */
  children: CollectionView[];
}

export interface CollectionRequest {
  labelIds: number[];
  categoryIds: number[];
  headerEn: string;
  headerFr: string;
  headerEs: string;
  subheaderEn: string;
  subheaderFr: string;
  subheaderEs: string;
  cardTextColor: string;
  parentId: number | null;
  sortOrder: number;
}

export interface CloudinaryResource {
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  createdAt: string;
  secureUrl: string;
  displayName: string | null;
}

export interface CloudinaryResourcesPage {
  resources: CloudinaryResource[];
  nextCursor: string | null;
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
  msiEnabled: boolean;
  stripeLiveMode: boolean;
  stripeLiveConfigured: boolean;
  standardShippingFee: number;
  extendedShippingFee: number;
  freeShippingThreshold: number;
}

/** Storefront-visible slice of AppSettings (GET /public/settings). */
export interface PublicSettings {
  msiEnabled: boolean;
  standardShippingFee: number;
  extendedShippingFee: number;
  freeShippingThreshold: number;
}

export interface StripeConfig {
  publishableKey: string;
  liveMode: boolean;
}

export interface BrevoQuota {
  sentToday: number;
  remaining: number;
  dailyLimit: number;
}


/** Format a monetary amount with thousands separators and a fixed number of decimals (default 2). */
export function formatMoney(amount: number | string, digits = 2): string {
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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
