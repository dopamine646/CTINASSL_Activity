const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: (token) => request('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
    logout: (token) => request('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  },
  health: async () => {
    const response = await fetch('/health')
    if (!response.ok) throw new Error('API health check failed')
    return response.json()
  },
  categories: {
    list: () => request('/categories'),
    create: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  },
  products: {
    list: () => request('/products'),
    get: (productId) => request(`/products/${productId}`),
    create: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (productId, body) => request(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (productId) => request(`/products/${productId}`, { method: 'DELETE' }),
  },
  variants: {
    list: (productId) => request(productId ? `/variants?productId=${encodeURIComponent(productId)}` : '/variants'),
    create: (body) => request('/variants', { method: 'POST', body: JSON.stringify(body) }),
    update: (variantId, body) => request(`/variants/${variantId}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (variantId) => request(`/variants/${variantId}`, { method: 'DELETE' }),
  },
  movements: {
    list: (variantId) => request(variantId ? `/inventory-movements?variantId=${encodeURIComponent(variantId)}` : '/inventory-movements'),
    adjust: (body) => request('/inventory-movements', { method: 'POST', body: JSON.stringify(body) }),
  },
  customers: {
    list: () => request('/customers'),
    create: (body) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
    update: (customerId, body) => request(`/customers/${customerId}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (customerId) => request(`/customers/${customerId}`, { method: 'DELETE' }),
  },
  addresses: {
    list: (customerId) => request(`/customers/${customerId}/addresses`),
    create: (customerId, body) => request(`/customers/${customerId}/addresses`, { method: 'POST', body: JSON.stringify(body) }),
  },
  orders: {
    list: (customerId) => request(customerId ? `/orders?customerId=${encodeURIComponent(customerId)}` : '/orders'),
    get: (orderId) => request(`/orders/${orderId}`),
    create: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
    updateStatus: (orderId, status) => request(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (orderId) => request(`/orders/${orderId}`, { method: 'DELETE' }),
  },
}
