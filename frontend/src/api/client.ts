import type { ItemView, ItemViewVerbose, ItemRequest, OrderView, VerboseClient, LabelView, AnnouncementView, SiteAssetView, CollectionView } from '../types';

interface LabelRequest { nameEn: string; nameFr: string; nameEs: string; }

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const ADMIN = import.meta.env.VITE_ADMIN_PAGE ?? '';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

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
    register: (data: { firstName: string; lastName: string; email: string; password: string }) =>
      request<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r.token),
  },
  items: {
    list: () => request<ItemView[]>('/public/items'),
    get: (id: number) => request<ItemView>(`/public/items/${id}`),
    byCategory: (category: string) => request<ItemView[]>(`/public/items/category/${category}`),
    byLabel: (labelId: number) => request<ItemView[]>(`/public/items/label/${labelId}`),
  },
  labels: {
    list: () => request<LabelView[]>('/public/labels'),
  },
  announcements: {
    list: () => request<AnnouncementView[]>('/public/announcements'),
  },
  siteAssets: {
    list: () => request<SiteAssetView[]>('/public/site-assets'),
  },
  collections: {
    list: () => request<CollectionView[]>('/public/collections'),
  },
  orders: {
    list: () => request<OrderView[]>('/api/orders'),
    create: (data: {
      items: { itemId: number; quantity: number }[];
      address: string;
      country: string;
      currency: string;
    }) =>
      request<{ order: OrderView; clientSecret: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: number) =>
      request<void>(`/api/orders/${id}/cancel`, { method: 'PATCH' }),
    getClientSecret: (id: number) =>
      request<{ clientSecret: string }>(`/api/orders/${id}/client-secret`)
        .then(r => r.clientSecret),
  },
  account: {
    getProfile: () =>
      request<{ firstName: string; lastName: string; email: string; address: string }>('/account/profile'),
    changePassword: (oldPassword: string, newPassword: string) =>
      request<void>('/account/password', { method: 'PATCH', body: JSON.stringify({ oldPassword, newPassword }) }),
    changeEmail: (password: string, newEmail: string) =>
      request<void>('/account/email', { method: 'PATCH', body: JSON.stringify({ password, newEmail }) }),
    changeAddress: (newAddress: string) =>
      request<void>(`/account/address?newAddress=${encodeURIComponent(newAddress)}`, { method: 'PATCH' }),
  },
  admin: {
    items: {
      listVerbose: () => request<ItemViewVerbose[]>(`/${ADMIN}/items`),
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
      deleteImage: (id: number) =>
        request<ItemView>(`/${ADMIN}/items/deleteimage/${id}`, { method: 'PATCH' }),
      uploadImage: async (itemId: number, file: File): Promise<ItemView> => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${BASE_URL}/${ADMIN}/items/image/${itemId}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
      createWithImage: async (data: ItemRequest, file: File): Promise<ItemView> => {
        const form = new FormData();
        form.append('item', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        form.append('file', file);
        const res = await fetch(`${BASE_URL}/${ADMIN}/items`, {
          method: 'POST',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
      updateWithImage: async (id: number, data: ItemRequest, file: File): Promise<ItemView> => {
        const form = new FormData();
        form.append('item', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        form.append('file', file);
        const res = await fetch(`${BASE_URL}/${ADMIN}/items/${id}`, {
          method: 'PATCH',
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
      create: (data: { labelId: number; headerEn: string; headerFr: string; headerEs: string; subheaderEn: string; subheaderFr: string; subheaderEs: string; color: string }) =>
        request<CollectionView>(`/${ADMIN}/collections`, { method: 'POST', body: JSON.stringify(data) }),
      updateText: (id: number, data: { labelId: number; headerEn: string; headerFr: string; headerEs: string; subheaderEn: string; subheaderFr: string; subheaderEs: string; color: string }) =>
        request<CollectionView>(`/${ADMIN}/collections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      uploadImage: async (id: number, file: File): Promise<CollectionView> => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${BASE_URL}/${ADMIN}/collections/${id}/image`, {
          method: 'PATCH',
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
    },
    siteAssets: {
      updateText: (slot: string, data: { headerEn: string; headerFr: string; headerEs: string; subheaderEn: string; subheaderFr: string; subheaderEs: string; color: string; ctaCategory: string | null; ctaLabelId: number | null }) =>
        request<SiteAssetView>(`/${ADMIN}/site-assets/${slot}`, { method: 'PATCH', body: JSON.stringify(data) }),
      uploadImage: async (slot: string, file: File): Promise<SiteAssetView> => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${BASE_URL}/${ADMIN}/site-assets/${slot}/image`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
      deleteImage: (slot: string) =>
        request<SiteAssetView>(`/${ADMIN}/site-assets/${slot}/image`, { method: 'DELETE' }),
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
