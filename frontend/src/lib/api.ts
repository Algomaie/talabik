import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let refreshRequest: Promise<string> | null = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isLogin = /\/auth\/(login|register|refresh)$/.test(original?.url || '');
    if (error.response?.status === 401 && original && !original._retry && !isLogin) {
      original._retry = true;
      try {
        if (!refreshRequest) {
          refreshRequest = (async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('No refresh token');
            const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
            localStorage.setItem('accessToken', data.data.accessToken);
            localStorage.setItem('refreshToken', data.data.refreshToken);
            return data.data.accessToken as string;
          })().finally(() => { refreshRequest = null; });
        }
        original.headers.Authorization = `Bearer ${await refreshRequest}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: Record<string, any>) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── Stores ──────────────────────────────────────────────────────
export const storesApi = {
  list: (page = 1, limit = 20) =>
    api.get('/stores', { params: { page, limit } }),
  getById: (id: string) => api.get(`/stores/${id}`),
  myStores: () => api.get('/stores/my'),
  create: (data: Record<string, any>) => api.post('/stores', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/stores/${id}`, data),
};

// ─── Products ────────────────────────────────────────────────────
export const productsApi = {
  list: (params: Record<string, any> = {}) =>
    api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: Record<string, any>) => api.post('/products', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// ─── Categories ──────────────────────────────────────────────────
export const categoriesApi = {
  listByStore: (storeId: string) => api.get(`/categories/stores/${storeId}/categories`),
};

// ─── Cart ────────────────────────────────────────────────────────
export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (productId: string, quantity: number) =>
    api.post('/cart/items', { productId, quantity }),
  updateItem: (itemId: string, quantity: number) =>
    api.patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart'),
};

// ─── Orders ──────────────────────────────────────────────────────
export const ordersApi = {
  create: (addressId: string, notes?: string, idempotencyKey?: string) =>
    api.post('/orders', { addressId, notes }, { headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
  list: (params: Record<string, any> = {}) =>
    api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  cancel: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  confirm: (id: string) => api.post(`/orders/${id}/confirm`),
  reject: (id: string, reason: string) =>
    api.post(`/orders/${id}/reject`, { reason }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
};

// ─── Addresses ───────────────────────────────────────────────────
export const addressesApi = {
  list: () => api.get('/addresses'),
  create: (data: Record<string, any>) => api.post('/addresses', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/addresses/${id}`, data),
  setDefault: (id: string) => api.patch(`/addresses/${id}/default`),
  remove: (id: string) => api.delete(`/addresses/${id}`),
};

// ─── Notifications ───────────────────────────────────────────────
export const notificationsApi = {
  list: (params: Record<string, any> = {}) =>
    api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── Deliveries ──────────────────────────────────────────────────
export const deliveriesApi = {
  available: (params: Record<string, any> = {}) =>
    api.get('/deliveries/available', { params }),
  accept: (id: string) => api.post(`/deliveries/${id}/accept`),
  pickup: (id: string) => api.post(`/deliveries/${id}/pickup`),
  startTransit: (id: string) => api.patch(`/deliveries/${id}/status`),
  updateLocation: (id: string, lat: number, lng: number) =>
    api.patch(`/deliveries/${id}/location`, { latitude: lat, longitude: lng }),
  complete: (id: string) => api.post(`/deliveries/${id}/complete`),
  history: (params: Record<string, any> = {}) =>
    api.get('/deliveries/history', { params }),
  earnings: () => api.get('/deliveries/earnings'),
};

// ─── Admin ───────────────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (params: Record<string, any> = {}) =>
    api.get('/admin/users', { params }),
  merchants: (params: Record<string, any> = {}) =>
    api.get('/admin/merchants', { params }),
  drivers: (params: Record<string, any> = {}) =>
    api.get('/admin/drivers', { params }),
  orders: (params: Record<string, any> = {}) =>
    api.get('/admin/orders', { params }),
  reports: () => api.get('/admin/reports'),
  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch(`/admin/users/${id}/status`, { isActive }),
  updateMerchantStatus: (id: string, status: string) =>
    api.patch(`/admin/merchants/${id}/status`, { status }),
  updateDriverStatus: (id: string, status: string) =>
    api.patch(`/admin/drivers/${id}/status`, { status }),
};

// ─── Users ───────────────────────────────────────────────────────
export const usersApi = {
  profile: () => api.get('/users/profile'),
  updateProfile: (data: Record<string, any>) => api.patch('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/password', { currentPassword, newPassword }),
};

// ─── Ratings ─────────────────────────────────────────────────────
export const ratingsApi = {
  create: (data: Record<string, any>) => api.post('/ratings', data),
  storeRatings: (storeId: string, params: Record<string, any> = {}) =>
    api.get(`/ratings/store/${storeId}`, { params }),
};

// ─── Drivers ─────────────────────────────────────────────────────
export const driversApi = {
  profile: () => api.get('/drivers/profile'),
  setAvailability: (availability: 'ONLINE' | 'OFFLINE') =>
    api.patch('/drivers/availability', { availability }),
};
