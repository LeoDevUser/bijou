import type { ItemView, ItemRequest, OrderView } from '../types';

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
  },
  admin: {
    items: {
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
        form.append('image', file);
        const res = await fetch(`${BASE_URL}/${ADMIN}/items/image/${itemId}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: form,
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw { status: res.status, ...body }; }
        return res.json();
      },
    },
    orders: {
      list: () => request<OrderView[]>(`/${ADMIN}/orders`),
      get: (id: number) => request<OrderView>(`/${ADMIN}/orders/${id}`),
      byStatus: (status: string) => request<OrderView[]>(`/${ADMIN}/orders/status/${status}`),
      byCountry: (country: string) => request<OrderView[]>(`/${ADMIN}/orders/country/${country}`),
    },
    users: {
      promote: (id: number) =>
        request<void>(`/${ADMIN}/promote/${id}`, { method: 'POST' }),
    },
  },
};
