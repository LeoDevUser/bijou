import type { ItemView, ItemViewVerbose, ItemRequest, ItemSizeRequest, OrderView, VerboseClient, LabelView, CategoryView, AnnouncementView, CollectionView, CollectionSiteAssetView, CollectionThemeView, SalesStats, ThemeConfig, TaxPreview, AppSettings, BrevoQuota, CloudinaryResourcesPage, FiscalCatalog } from '../types';
import { getToken, setToken } from './tokenStore';

interface LabelRequest { nameEn: string; nameFr: string; nameEs: string; }
interface CategoryRequest { nameEn: string; nameFr: string; nameEs: string; }

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const ADMIN = import.meta.env.VITE_ADMIN_PAGE ?? '';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const body = await res.json();
    setToken(body.token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, ...body };
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }).then(r => r.token),
    register: (data: { firstName: string; lastName: string; email: string; password: string; addressLine1: string; addressLine2?: string; colonial?: string; city: string; state: string; postalCode: string; country: string; phoneNumber: string; language: string }) =>
      request<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r.token),
    refresh: () =>
      fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
        .then(res => {
          if (!res.ok) return Promise.reject();
          return res.json() as Promise<{ token: string }>;
        })
        .then(r => r.token),
    logout: () =>
      fetch(`${BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
        .then(() => {}),
  },
  metalPrices: () => request<{ goldMxnPerGram: number | null; silverMxnPerGram: number | null }>('/public/metal-prices'),
  items: {
    list: () => request<ItemView[]>('/public/items'),
    trending: () => request<ItemView[]>('/public/items/trending'),
    bestselling: () => request<ItemView[]>('/public/items/bestselling'),
    get: (id: number) => request<ItemView>(`/public/items/${id}`),
    byCategory: (categoryId: number) => request<ItemView[]>(`/public/items/category/${categoryId}`),
    byLabel: (labelId: number) => request<ItemView[]>(`/public/items/label/${labelId}`),
  },
  labels: {
    list: () => request<LabelView[]>('/public/labels'),
  },
  categories: {
    list: () => request<CategoryView[]>('/public/categories'),
  },
  announcements: {
    list: () => request<AnnouncementView[]>('/public/announcements'),
  },
  collections: {
    list: () => request<CollectionView[]>('/public/collections'),
    getMain: () => request<CollectionView>('/public/collections/main'),
    getById: (id: number) => request<CollectionView>(`/public/collections/${id}`),
    items: (id: number) => request<ItemView[]>(`/public/collections/${id}/items`),
    trending: (id: number) => request<ItemView[]>(`/public/collections/${id}/items/trending`),
  },
  theme: {
    get: () => request<ThemeConfig>('/public/theme'),
  },
  fiscal: {
    catalog: () => request<FiscalCatalog>('/public/fiscal/catalog'),
  },
  orders: {
    list: () => request<OrderView[]>('/api/orders'),
    create: (data: {
      items: { itemId: number; sizeId?: number | null; quantity: number }[];
      addressLine1: string;
      addressLine2?: string | null;
      colonial?: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      currency: string;
      installments?: number | null;
      facturaRequested?: boolean;
      rfc?: string | null;
      regimenFiscal?: string | null;
      cfdiUso?: string | null;
    }) =>
      request<{ order: OrderView; clientSecret: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    taxPreview: (data: { items: { itemId: number; sizeId?: number | null; quantity: number }[]; country: string; currency: string; state?: string | null }) =>
      request<TaxPreview>('/api/orders/preview', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: number) =>
      request<void>(`/api/orders/${id}/cancel`, { method: 'PATCH' }),
    getClientSecret: (id: number) =>
      request<{ clientSecret: string }>(`/api/orders/${id}/client-secret`)
        .then(r => r.clientSecret),
  },
  account: {
    getProfile: () =>
      request<{ firstName: string; lastName: string; email: string; addressLine1: string; addressLine2: string | null; colonial: string | null; city: string; state: string; postalCode: string; country: string; phoneNumber: string; language: string; rfc: string | null; regimenFiscal: string | null }>('/account/profile'),
    changePassword: (oldPassword: string, newPassword: string) =>
      request<void>('/account/password', { method: 'PATCH', body: JSON.stringify({ oldPassword, newPassword }) }),
    changeEmail: (password: string, newEmail: string) =>
      request<void>('/account/email', { method: 'PATCH', body: JSON.stringify({ password, newEmail }) }),
    changeAddress: (req: { addressLine1: string; addressLine2?: string; colonial?: string; city: string; state: string; postalCode: string; country: string; phoneNumber: string }) =>
      request<void>('/account/address', { method: 'PATCH', body: JSON.stringify(req) }),
    changeLanguage: (newLanguage: string) =>
      request<void>(`/account/language?newLanguage=${encodeURIComponent(newLanguage)}`, { method: 'PATCH' }),
    changePhone: (phoneNumber: string) =>
      request<void>(`/account/phone?phoneNumber=${encodeURIComponent(phoneNumber)}`, { method: 'PATCH' }),
  },
  admin: {
    items: {
      listVerbose: () => request<ItemViewVerbose[]>(`/${ADMIN}/items`),
      salesStats: () => request<SalesStats>(`/${ADMIN}/items/salesstats`),
      create: (data: ItemRequest) =>
        request<ItemView>(`/${ADMIN}/items`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: ItemRequest) =>
        request<ItemView>(`/${ADMIN}/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: number) =>
        request<void>(`/${ADMIN}/items/${id}`, { method: 'DELETE' }),
      activate: (id: number) =>
        request<void>(`/${ADMIN}/items/activate/${id}`, { method: 'PATCH' }),
      deactivate: (id: number) =>
        request<void>(`/${ADMIN}/items/deactivate/${id}`, { method: 'PATCH' }),
      addAsset: async (itemId: number, file: File, name?: string): Promise<ItemView> => {
        const form = new FormData();
        form.append('file', file);
        if (name) form.append('name', name);
        const res = await fetch(`${BASE_URL}/${ADMIN}/items/${itemId}/assets`, {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
      deleteAsset: (itemId: number, assetId: number) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/assets/${assetId}`, { method: 'DELETE' }),
      addSizes: (itemId: number, reqs: ItemSizeRequest[]) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/sizes`, { method: 'POST', body: JSON.stringify(reqs) }),
      updateSize: (itemId: number, sizeId: number, req: ItemSizeRequest) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/sizes/${sizeId}`, { method: 'PATCH', body: JSON.stringify(req) }),
      deleteSize: (itemId: number, sizeId: number) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/sizes/${sizeId}`, { method: 'DELETE' }),
      moveSizeUp: (itemId: number, sizeId: number) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/sizes/${sizeId}/up`, { method: 'PATCH' }),
      moveSizeDown: (itemId: number, sizeId: number) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/sizes/${sizeId}/down`, { method: 'PATCH' }),
      // Stock is managed separately from the item edit so concurrent sales aren't clobbered.
      adjustStock: (id: number, delta: number) =>
        request<ItemView>(`/${ADMIN}/items/${id}/stock/adjust`, { method: 'PATCH', body: JSON.stringify({ delta }) }),
      setStock: (id: number, stock: number, expectedVersion: number) =>
        request<ItemView>(`/${ADMIN}/items/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ stock, expectedVersion }) }),
      adjustSizeStock: (itemId: number, sizeId: number, delta: number) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/sizes/${sizeId}/stock/adjust`, { method: 'PATCH', body: JSON.stringify({ delta }) }),
      setSizeStock: (itemId: number, sizeId: number, stock: number, expectedVersion: number) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/sizes/${sizeId}/stock`, { method: 'PATCH', body: JSON.stringify({ stock, expectedVersion }) }),
      pickAsset: (itemId: number, data: { publicId: string; resourceType: string; secureUrl: string }) =>
        request<ItemView>(`/${ADMIN}/items/${itemId}/assets/pick`, { method: 'PATCH', body: JSON.stringify(data) }),
      createWithImage: async (data: ItemRequest, file: File, name?: string): Promise<ItemView> => {
        const form = new FormData();
        form.append('item', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        form.append('file', file);
        if (name) form.append('name', name);
        const res = await fetch(`${BASE_URL}/${ADMIN}/items`, {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
      updateWithImage: async (id: number, data: ItemRequest, file: File, name?: string): Promise<ItemView> => {
        const form = new FormData();
        form.append('item', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        form.append('file', file);
        if (name) form.append('name', name);
        const res = await fetch(`${BASE_URL}/${ADMIN}/items/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
    },
    labels: {
      create: (req: LabelRequest) =>
        request<LabelView>(`/${ADMIN}/labels`, { method: 'POST', body: JSON.stringify(req) }),
      delete: (id: number) =>
        request<void>(`/${ADMIN}/labels/${id}`, { method: 'DELETE' }),
    },
    categories: {
      create: (req: CategoryRequest) =>
        request<CategoryView>(`/${ADMIN}/categories`, { method: 'POST', body: JSON.stringify(req) }),
      delete: (id: number) =>
        request<void>(`/${ADMIN}/categories/${id}`, { method: 'DELETE' }),
    },
    announcements: {
      list: () => request<AnnouncementView[]>(`/${ADMIN}/announcements`),
      create: (data: { textEn: string; textFr: string; textEs: string; active: boolean }) =>
        request<AnnouncementView>(`/${ADMIN}/announcements`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: { textEn: string; textFr: string; textEs: string; active: boolean }) =>
        request<AnnouncementView>(`/${ADMIN}/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: number) =>
        request<void>(`/${ADMIN}/announcements/${id}`, { method: 'DELETE' }),
      moveUp: (id: number) =>
        request<AnnouncementView[]>(`/${ADMIN}/announcements/${id}/up`, { method: 'PATCH' }),
      moveDown: (id: number) =>
        request<AnnouncementView[]>(`/${ADMIN}/announcements/${id}/down`, { method: 'PATCH' }),
    },
    collections: {
      list: () => request<CollectionView[]>(`/${ADMIN}/collections`),
      setMain: (id: number) => request<CollectionView>(`/${ADMIN}/collections/${id}/main`, { method: 'PATCH' }),
      setActive: (id: number, active: boolean) =>
        request<CollectionView>(`/${ADMIN}/collections/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
      create: (data: { labelIds: number[]; categoryIds: number[]; headerEn: string; headerFr: string; headerEs: string; subheaderEn: string; subheaderFr: string; subheaderEs: string; color: string }) =>
        request<CollectionView>(`/${ADMIN}/collections`, { method: 'POST', body: JSON.stringify(data) }),
      updateText: (id: number, data: { labelIds: number[]; categoryIds: number[]; headerEn: string; headerFr: string; headerEs: string; subheaderEn: string; subheaderFr: string; subheaderEs: string; color: string }) =>
        request<CollectionView>(`/${ADMIN}/collections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      uploadImage: async (id: number, file: File, name?: string): Promise<CollectionView> => {
        const form = new FormData();
        form.append('file', file);
        if (name) form.append('name', name);
        const res = await fetch(`${BASE_URL}/${ADMIN}/collections/${id}/image`, {
          method: 'PATCH',
          credentials: 'include',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
      deleteImage: (id: number) =>
        request<CollectionView>(`/${ADMIN}/collections/${id}/image`, { method: 'DELETE' }),
      delete: (id: number) =>
        request<void>(`/${ADMIN}/collections/${id}`, { method: 'DELETE' }),
      updateAsset: (id: number, slot: string, data: { headerEn: string; headerFr: string; headerEs: string; subheaderEn: string; subheaderFr: string; subheaderEs: string; taglineEn: string | null; taglineFr: string | null; taglineEs: string | null; color: string; headerColor: string | null; subheaderColor: string | null; taglineColor: string | null; ctaCategory: string | null; ctaLabelId: number | null }) =>
        request<CollectionSiteAssetView>(`/${ADMIN}/collections/${id}/assets/${slot}`, { method: 'PATCH', body: JSON.stringify(data) }),
      uploadAssetImage: async (id: number, slot: string, file: File, name?: string): Promise<CollectionSiteAssetView> => {
        const form = new FormData();
        form.append('file', file);
        if (name) form.append('name', name);
        const res = await fetch(`${BASE_URL}/${ADMIN}/collections/${id}/assets/${slot}/image`, {
          method: 'PATCH',
          credentials: 'include',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
      deleteAssetImage: (id: number, slot: string) =>
        request<CollectionSiteAssetView>(`/${ADMIN}/collections/${id}/assets/${slot}/image`, { method: 'DELETE' }),
      pickMedia: (id: number, data: { publicId: string; resourceType: string; secureUrl: string }) =>
        request<CollectionView>(`/${ADMIN}/collections/${id}/pick`, { method: 'PATCH', body: JSON.stringify(data) }),
      pickAsset: (id: number, slot: string, data: { publicId: string; resourceType: string; secureUrl: string }) =>
        request<CollectionSiteAssetView>(`/${ADMIN}/collections/${id}/assets/${slot}/pick`, { method: 'PATCH', body: JSON.stringify(data) }),
      updateTheme: (id: number, data: CollectionThemeView) =>
        request<CollectionThemeView>(`/${ADMIN}/collections/${id}/theme`, { method: 'PATCH', body: JSON.stringify(data) }),
      resetTheme: (id: number) =>
        request<void>(`/${ADMIN}/collections/${id}/theme`, { method: 'DELETE' }),
    },
    cloudinary: {
      list: (type: string, nextCursor?: string) => {
        const params = new URLSearchParams({ type });
        if (nextCursor) params.set('nextCursor', nextCursor);
        return request<CloudinaryResourcesPage>(`/${ADMIN}/cloudinary/resources?${params}`);
      },
      delete: (publicId: string, type: string) => {
        const params = new URLSearchParams({ publicId, type });
        return request<void>(`/${ADMIN}/cloudinary/resources?${params}`, { method: 'DELETE' });
      },
      rename: (publicId: string, type: string, name: string) => {
        const params = new URLSearchParams({ publicId, type, name });
        return request<void>(`/${ADMIN}/cloudinary/resources/name?${params}`, { method: 'PATCH' });
      },
    },
    theme: {
      update: (data: ThemeConfig) =>
        request<ThemeConfig>(`/${ADMIN}/theme`, { method: 'PATCH', body: JSON.stringify(data) }),
    },
    orders: {
      list: () => request<OrderView[]>(`/${ADMIN}/orders`),
      get: (id: number) => request<OrderView>(`/${ADMIN}/orders/${id}`),
      byStatus: (status: string) => request<OrderView[]>(`/${ADMIN}/orders/status/${status}`),
      byCountry: (country: string) => request<OrderView[]>(`/${ADMIN}/orders/country/${country}`),
      changeStatus: (id: number, status: string) =>
        request<void>(`/${ADMIN}/orders/status`, { method: 'PATCH', body: JSON.stringify({ id, status }) }),
      setTracking: (id: number, tracking: string) =>
        request<void>(`/${ADMIN}/orders/tracking`, { method: 'PATCH', body: JSON.stringify({ id, tracking }) }),
      sendFactura: (id: number) =>
        request<void>(`/${ADMIN}/orders/${id}/factura/send`, { method: 'POST' }),
      uploadFactura: async (id: number, file: File): Promise<OrderView> => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${BASE_URL}/${ADMIN}/orders/${id}/factura`, {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
    },
    settings: {
      get: () => request<AppSettings>(`/${ADMIN}/settings`),
      setRelay: (enabled: boolean) =>
        request<AppSettings>(`/${ADMIN}/settings/relay`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
      setMsi: (enabled: boolean) =>
        request<AppSettings>(`/${ADMIN}/settings/msi`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
      setShipping: (config: { standardShippingFee: number; extendedShippingFee: number; freeShippingThreshold: number }) =>
        request<AppSettings>(`/${ADMIN}/settings/shipping`, { method: 'PATCH', body: JSON.stringify(config) }),
      brevoQuota: () => request<BrevoQuota>(`/${ADMIN}/settings/brevo-quota`),
    },
    users: {
      listVerbose: () => request<VerboseClient[]>(`/account/${ADMIN}/clients/verbose`),
      listAdmins: () => request<VerboseClient[]>(`/account/${ADMIN}/admins`),
      getProfile: (id: number) => request<VerboseClient>(`/account/${ADMIN}/profile/${id}`),
      promote: (id: number, adminPassword: string) =>
        request<void>(`/account/${ADMIN}/promote`, { method: 'POST', body: JSON.stringify({ id, adminPassword }) }),
    },
  },
};
