import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import './App.css'

const iconOptions = [
  { label: 'Palette', value: '🎨' },
  { label: 'Paper', value: '📄' },
  { label: 'Brush', value: '🖌️' },
  { label: 'Pencil', value: '✏️' },
]

const accentOptions = [
  { label: 'Coral Glow', value: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
  { label: 'Ocean Wash', value: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { label: 'Sunset Harvest', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { label: 'Soft Mist', value: 'linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)' },
  { label: 'Forest Light', value: 'linear-gradient(135deg, #96e6a1 0%, #d4fc79 100%)' },
  { label: 'Lavender Bloom', value: 'linear-gradient(135deg, #cdb4db 0%, #ffc8dd 100%)' },
]

const defaultForm = {
  name: '',
  category: 'Paints',
  price: '',
  stock: '',
  description: '',
  symbol: '🎨',
  tint: accentOptions[0].value,
}

const navTabs = [
  { id: 'shop', label: 'Shop Storefront' },
  { id: 'products', label: 'Products' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'customer orders', label: 'Customer Orders' },
]

function App() {
  const [products, setProducts] = useState([
    { id: 'demo-1', variantId: null, name: 'Acrylic Studio Set', category: 'Paints', categoryId: 'demo-paints', price: 42, stock: 18, rating: 4.9, description: 'High-pigment acrylics for bold textures and layered color work.', symbol: '🎨', tint: accentOptions[0].value },
    { id: 'demo-2', variantId: null, name: 'Watercolor Essentials', category: 'Paints', categoryId: 'demo-paints', price: 36, stock: 12, rating: 4.7, description: 'Pocket-friendly watercolor starter kit with rich, blendable pigments.', symbol: '🎨', tint: accentOptions[1].value },
    { id: 'demo-3', variantId: null, name: 'Canvas Pack Pro', category: 'Canvas', categoryId: 'demo-canvas', price: 58, stock: 9, rating: 4.8, description: 'Pre-gessoed canvases for gallery-ready paintings and practice work.', symbol: '📄', tint: accentOptions[2].value },
    { id: 'demo-4', variantId: null, name: 'Brush Master Kit', category: 'Tools', categoryId: 'demo-tools', price: 28, stock: 21, rating: 4.6, description: 'A balanced set of detail and wash brushes for smooth, precise strokes.', symbol: '🖌️', tint: accentOptions[3].value },
  ])
  const [categories, setCategories] = useState([
    { categoryId: 'demo-paints', name: 'Paints' },
    { categoryId: 'demo-canvas', name: 'Canvas' },
    { categoryId: 'demo-tools', name: 'Tools' },
  ])
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pintura_session')) } catch { return null }
  })
  const [authMode, setAuthMode] = useState('login')
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutData, setCheckoutData] = useState({ name: '', email: '', contact: '', addressLine1: '', city: '', country: 'Philippines' })
  const [formData, setFormData] = useState(defaultForm)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('shop')
  const [orders, setOrders] = useState([
    { id: 'demo-order-1', customerName: 'Alicia M.', items: [{ id: 'demo-1', qty: 1 }, { id: 'demo-3', qty: 1 }], total: 100, status: 'processing' },
    { id: 'demo-order-2', customerName: 'Theo R.', items: [{ id: 'demo-4', qty: 2 }], total: 56, status: 'pending' },
  ])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [categoryRows, productRows, variantRows, orderRows] = await Promise.all([
        api.categories.list(),
        api.products.list(),
        api.variants.list(),
        api.orders.list(session?.user.role === 'customer' ? session.user.customerId : undefined),
      ])

      setCategories(categoryRows)

      const categoryById = Object.fromEntries(categoryRows.map((category) => [category.categoryId, category]))
      const variantsByProduct = Object.fromEntries(productRows.map((product) => [
        product.productId,
        variantRows.find((variant) => variant.productId === product.productId && variant.active),
      ]))

      setProducts(productRows.map((product) => {
        const variant = variantsByProduct[product.productId]
        return {
          id: product.productId,
          variantId: variant?.variantId,
          name: product.name,
          category: categoryById[product.categoryId]?.name || 'Uncategorized',
          categoryId: product.categoryId,
          price: variant?.price || 0,
          stock: variant?.stockOnHand || 0,
          rating: 4.8,
          description: product.description || '',
          symbol: '🎨',
          tint: accentOptions[0].value,
        }
      }))

      setOrders(orderRows.map((order) => ({
        id: order.orderId,
        customerName: order.customer?.customerName || order.customerId,
        items: (order.items || []).map((item) => ({
          id: item.variantId,
          name: item.productName,
          qty: item.quantity,
          price: item.unitPrice,
        })),
        total: order.subtotal,
        status: order.status,
      })))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const categoryNames = ['All', ...new Set(products.map((product) => product.category))]

  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter((product) => product.category === selectedCategory)

  const cartItems = cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.id)
      return product ? { ...product, qty: item.qty } : null
    })
    .filter(Boolean)

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const shipping = subtotal > 0 ? 12 : 0
  const total = subtotal + shipping

  const soldCounts = products.reduce((summary, product) => {
    const sold = orders.reduce((count, order) => {
      const matched = order.items.find((item) => item.id === product.id)
      return count + (matched ? matched.qty : 0)
    }, 0)

    summary[product.id] = sold
    return summary
  }, {})

  const resetForm = () => {
    setFormData(defaultForm)
    setEditingId(null)
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const addToCart = (product) => {
    setCart((previous) => {
      const existingItem = previous.find((item) => item.id === product.id)

      if (existingItem) {
        return previous.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        )
      }

      return [...previous, { id: product.id, qty: 1 }]
    })
  }

  const updateCartQty = (productId, change) => {
    setCart((previous) =>
      previous
        .map((item) =>
          item.id === productId ? { ...item, qty: Math.max(0, item.qty + change) } : item,
        )
        .filter((item) => item.qty > 0),
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = formData.name.trim()
    const description = formData.description.trim()
    const price = Number(formData.price)
    const stock = Number(formData.stock)

    if (!name || !description || price < 0 || stock < 0) {
      setError('Name, description, price, and stock are required.')
      return
    }

    try {
      setError('')
      let category = categories.find((item) => item.name === formData.category)
      if (!category) {
        category = await api.categories.create({ name: formData.category })
      }

      if (editingId) {
        const product = products.find((item) => item.id === editingId)
        await api.products.update(editingId, { name, description, categoryId: category.categoryId })
        if (product?.variantId) {
          await api.variants.update(product.variantId, { price, active: true })
          if (stock !== product.stock) {
            await api.movements.adjust({
              variantId: product.variantId,
              type: 'adjustment',
              quantityDelta: stock - product.stock,
              reason: 'Frontend inventory adjustment',
            })
          }
        }
      } else {
        const product = await api.products.create({ name, description, categoryId: category.categoryId })
        await api.variants.create({
          productId: product.productId,
          sku: `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20)}-${Date.now().toString().slice(-6)}`,
          price,
          active: true,
        })
        const createdVariants = await api.variants.list(product.productId)
        if (stock > 0 && createdVariants[0]) {
          await api.movements.adjust({
            variantId: createdVariants[0].variantId,
            type: 'receipt',
            quantityDelta: stock,
            reason: 'Initial stock',
          })
        }
      }

      resetForm()
      await loadData()
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      description: product.description,
      symbol: product.symbol,
      tint: product.tint,
    })
  }

  const handleDelete = async (productId) => {
    const product = products.find((item) => item.id === productId)
    if (!window.confirm(`Delete ${product?.name || 'this product'}?`)) return

    try {
      setError('')
      await api.products.delete(productId)
      setCart((previous) => previous.filter((item) => item.id !== productId))
      if (editingId === productId) resetForm()
      await loadData()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const handleCheckout = async (event) => {
    event?.preventDefault()
    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }
    if (!checkoutData.name.trim() || !checkoutData.addressLine1.trim() || !checkoutData.city.trim()) {
      setError('Name, address, and city are required.')
      return
    }

    try {
      setError('')
      const customerId = session.user.customerId
      if (!customerId) throw new Error('This account is not linked to a customer profile')
      await api.customers.update(customerId, {
        customerName: checkoutData.name.trim(),
        ...(checkoutData.email ? { email: checkoutData.email.trim() } : {}),
        ...(checkoutData.contact ? { contact: checkoutData.contact.trim() } : {}),
      })
      const address = await api.addresses.create(customerId, {
        label: 'Delivery address',
        addressLine1: checkoutData.addressLine1.trim(),
        city: checkoutData.city.trim(),
        country: checkoutData.country.trim(),
      })
      await api.orders.create({
        customerId: customerId,
        addressId: address.addressId,
        items: cartItems.map((item) => ({ variantId: item.variantId, quantity: item.qty })),
      })
      setCart([])
      setCheckoutOpen(false)
      setCheckoutData({ name: '', email: '', contact: '', addressLine1: '', city: '', country: 'Philippines' })
      await loadData()
    } catch (checkoutError) {
      setError(checkoutError.message)
    }
  }

  const handleOrderStatusChange = async (orderId, nextStatus) => {
    try {
      setError('')
      await api.orders.updateStatus(orderId, nextStatus)
      await loadData()
    } catch (statusError) {
      setError(statusError.message)
    }
  }

  const handleOrderDelete = async (orderId) => {
    if (!window.confirm('Delete this order?')) return
    try {
      setError('')
      await api.orders.delete(orderId)
      await loadData()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const handleAuth = async (event) => {
    event.preventDefault()
    try {
      setError('')
      setLoading(true)
      const result = authMode === 'register'
        ? await api.auth.register({ name: authData.name, email: authData.email, password: authData.password, role: 'customer' })
        : await api.auth.login({ email: authData.email, password: authData.password })
      const nextSession = { token: result.token, user: result.user }
      localStorage.setItem('pintura_session', JSON.stringify(nextSession))
      setSession(nextSession)
      setActiveTab(result.user.role === 'admin' ? 'dashboard' : 'shop')
      setAuthData({ name: '', email: '', password: '' })
      await loadData()
    } catch (authError) {
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (session?.token) await api.auth.logout(session.token)
    } catch {
      // Clear the local session even if the backend request fails.
    }
    localStorage.removeItem('pintura_session')
    setSession(null)
    setCart([])
  }

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark auth-mark">P</div>
          <p className="eyebrow">Pintura De Mercado</p>
          <h2>{authMode === 'login' ? 'Welcome back' : 'Create customer account'}</h2>
          {error && <div className="api-error" role="alert">{error}</div>}
          <form className="auth-form" onSubmit={handleAuth}>
            {authMode === 'register' && (
              <label>Full name<input value={authData.name} onChange={(event) => setAuthData((previous) => ({ ...previous, name: event.target.value }))} required /></label>
            )}
            <label>Email<input type="email" value={authData.email} onChange={(event) => setAuthData((previous) => ({ ...previous, email: event.target.value }))} required /></label>
            <label>Password<input type="password" value={authData.password} onChange={(event) => setAuthData((previous) => ({ ...previous, password: event.target.value }))} required minLength="6" /></label>
            <button type="submit" className="primary-button">{authMode === 'login' ? 'Log in' : 'Create account'}</button>
          </form>
          <button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError('') }}>
            {authMode === 'login' ? 'New customer? Create an account' : 'Already have an account? Log in'}
          </button>
          {authMode === 'login' && <div className="demo-credentials"><strong>Demo accounts</strong><span>Customer: customer@pintura.com / customer123</span><span>Admin: admin@pintura.com / admin123</span></div>}
        </section>
      </main>
    )
  }

  const visibleTabs = session.user.role === 'admin'
    ? navTabs.filter((tab) => tab.id !== 'shop')
    : navTabs.filter((tab) => tab.id === 'shop' || tab.id === 'customer orders')

  return (
    <div className="app-shell admin-layout">
      {error && <div className="api-error" role="alert">{error}</div>}
      {loading && <div className="api-loading">Loading inventory...</div>}

      <aside className="left-sidebar">
        <div className="brand-block sidebar-brand">
          <div className="brand-mark">P</div>
          <div>
            <p className="eyebrow">Art marketplace</p>
            <h1>Pintura De Mercado</h1>
          </div>
        </div>

        <nav className="side-nav" aria-label="Sidebar navigation">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="session-block">
          <strong>{session.user.name}</strong>
          <span>{session.user.role === 'admin' ? 'Administrator' : 'Customer'}</span>
          <button type="button" className="ghost-button" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <div className="workspace-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Store overview</p>
            <h2>{activeTab === 'shop' ? 'Shop Storefront' : activeTab === 'products' ? 'Products' : activeTab === 'inventory' ? 'Inventory' : 'Customer Orders'}</h2>
          </div>

          <button type="button" className="primary-button cart-button" onClick={() => activeTab === 'shop' ? setCheckoutOpen(true) : setActiveTab('shop')}>
            Cart ({cart.length})
          </button>
        </header>

        {activeTab === 'shop' && (
          <main className="main-layout">
            <section className="storefront-panel" id="shop">
              <div className="hero-banner">
                <div className="hero-copy">
                  <p className="eyebrow">Paint and art essentials</p>
                  <h2>Build your next creative project.</h2>
                  <p>
                    High-quality supplies for painters, illustrators, and makers who want their
                    next idea to feel just right.
                  </p>

                  <div className="cta-row">
                    <button type="button" className="primary-button">
                      Shop collection
                    </button>
                    <button type="button" className="secondary-button">
                      Best sellers
                    </button>
                  </div>
                </div>

                <div className="hero-visual" aria-label="Popular paint items">
                  <div className="floating-card card-one">
                    <span>🎨</span>
                    <p>Acrylic sets</p>
                  </div>
                  <div className="floating-card card-two">
                    <span>🖼️</span>
                    <p>Canvas packs</p>
                  </div>
                  <div className="floating-card card-three">
                    <span>🧴</span>
                    <p>Brush care</p>
                  </div>
                </div>
              </div>

              <div className="shop-toolbar">
                <div className="category-pills" aria-label="Filter products by category">
                  {categoryNames.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={category === selectedCategory ? 'pill active' : 'pill'}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <span className="result-count">{filteredProducts.length} items</span>
              </div>

              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="product-card">
                    <div className="product-visual" style={{ background: product.tint }}>
                      <span>{product.symbol}</span>
                    </div>

                    <div className="product-info">
                      <div className="product-top-row">
                        <span className="category-tag">{product.category}</span>
                      </div>

                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>

                      <div className="product-meta">
                        <span>⭐ {product.rating}</span>
                        <span>{product.stock} in stock</span>
                      </div>

                      <div className="price-row">
                        <strong>${product.price}</strong>
                        <button type="button" className="primary-button" onClick={() => addToCart(product)}>
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <section className="about-strip" id="about">
                <div>
                  <p className="eyebrow">Why artists shop here</p>
                  <h3>Curated materials for every creative rhythm.</h3>
                </div>
                <div className="about-stats">
                  <div>
                    <strong>1200+</strong>
                    <span>Supplies</span>
                  </div>
                  <div>
                    <strong>4.8/5</strong>
                    <span>Average rating</span>
                  </div>
                  <div>
                    <strong>2-day</strong>
                    <span>Dispatch</span>
                  </div>
                </div>
              </section>
            </section>

            <aside className="sidebar-panel" id="inventory">
              <div className="cart-panel">
                <h3>Shopping cart</h3>

                {cartItems.length === 0 ? (
                  <p className="empty-state">Your cart is empty.</p>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div>
                        <strong>{item.name}</strong>
                        <p>${item.price} each</p>
                      </div>

                      <div className="qty-controls">
                        <button type="button" onClick={() => updateCartQty(item.id, -1)}>
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => updateCartQty(item.id, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div className="totals">
                  <div>
                    <span>Subtotal</span>
                    <strong>${subtotal}</strong>
                  </div>
                  <div>
                    <span>Shipping</span>
                    <strong>${shipping}</strong>
                  </div>
                  <div className="total-row">
                    <span>Total</span>
                    <strong>${total}</strong>
                  </div>
                </div>
              </div>

            </aside>
          </main>
        )}

        {activeTab === 'products' && (
          <main className="panel-view">
            <div className="content-card product-panel">
              <div className="panel-header compact-header">
                <h3>Product catalog</h3>
                <button type="button" className="primary-button" onClick={() => setActiveTab('dashboard')}>
                  View store
                </button>
              </div>

              <div className="product-grid dashboard-grid">
                {products.map((product) => (
                  <article key={product.id} className="product-card">
                    <div className="product-visual" style={{ background: product.tint }}>
                      <span>{product.symbol}</span>
                    </div>

                    <div className="product-info">
                      <div className="product-top-row">
                        <span className="category-tag">{product.category}</span>
                        <button type="button" className="ghost-button" onClick={() => handleEdit(product)}>
                          Edit
                        </button>
                      </div>

                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>

                      <div className="product-meta">
                        <span>⭐ {product.rating}</span>
                        <span>{product.stock} in stock</span>
                      </div>

                      <div className="price-row">
                        <strong>${product.price}</strong>
                        <button type="button" className="primary-button" onClick={() => addToCart(product)}>
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="content-card admin-panel product-editor">
              <div className="panel-header">
                <h3>{editingId ? 'Edit product' : 'Add product'}</h3>
                {editingId && (
                  <button type="button" className="ghost-button" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>

              <form className="product-form" onSubmit={handleSubmit}>
                <label>
                  Product name
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    placeholder="Canvas starter pack"
                    onChange={handleInputChange}
                  />
                </label>

                <div className="inline-fields">
                  <label>
                    Category
                    <select name="category" value={formData.category} onChange={handleInputChange}>
                      <option value="Paints">Paints</option>
                      <option value="Canvas">Canvas</option>
                      <option value="Tools">Tools</option>
                    </select>
                  </label>

                  <label>
                    Price
                    <input
                      type="number"
                      name="price"
                      min="1"
                      value={formData.price}
                      onChange={handleInputChange}
                    />
                  </label>
                </div>

                <label>
                  Stock level
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    value={formData.stock}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    name="description"
                    rows="4"
                    value={formData.description}
                    placeholder="Describe the product"
                    onChange={handleInputChange}
                  />
                </label>

                <div className="inline-fields">
                  <label>
                    Icon
                    <select name="symbol" value={formData.symbol} onChange={handleInputChange}>
                      {iconOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} {option.value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Accent
                    <select name="tint" value={formData.tint} onChange={handleInputChange}>
                      {accentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="primary-button">
                    {editingId ? 'Save changes' : 'Add product'}
                  </button>
                  {editingId && (
                    <button type="button" className="danger-button" onClick={() => handleDelete(editingId)}>
                      Delete selected
                    </button>
                  )}
                </div>
              </form>
            </div>
          </main>
        )}

        {activeTab === 'inventory' && (
          <main className="panel-view single-panel">
            <div className="content-card inventory-panel">
              <div className="panel-header compact-header">
                <h3>Inventory overview</h3>
                <span className="result-count">{products.length} total products</span>
              </div>

              <div className="inventory-grid">
                {products.map((product) => (
                  <div key={product.id} className="inventory-row">
                    <div className="inventory-title">
                      <span className="mini-icon" style={{ background: product.tint }}>{product.symbol}</span>
                      <div>
                        <strong>{product.name}</strong>
                        <small>{product.category}</small>
                      </div>
                    </div>
                    <div className="inventory-metrics">
                      <span>Sold: {soldCounts[product.id] || 0}</span>
                      <span>{product.stock} in stock</span>
                      <span>${product.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {activeTab === 'customer orders' && (
          <main className="panel-view single-panel">
            <div className="content-card orders-panel">
              <div className="panel-header compact-header">
                <h3>Customer orders</h3>
                <span className="result-count">{orders.length} total orders</span>
              </div>

              <div className="order-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-row">
                    <div>
                      <strong>#{order.id}</strong>
                      <small>
                        {order.customerName} • {order.items.reduce((sum, item) => sum + item.qty, 0)} item(s)
                      </small>
                    </div>

                    <div className="order-actions">
                      {session.user.role === 'admin' ? (
                        <>
                          <select
                            value={order.status}
                            onChange={(event) => handleOrderStatusChange(order.id, event.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button type="button" className="danger-button small-button" onClick={() => handleOrderDelete(order.id)}>Delete</button>
                        </>
                      ) : (
                        <span className="order-status">{order.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {checkoutOpen && (
          <div className="checkout-overlay" role="dialog" aria-modal="true" aria-label="Checkout">
            <form className="checkout-modal" onSubmit={handleCheckout}>
              <div className="panel-header">
                <h3>Checkout</h3>
                <button type="button" className="ghost-button" onClick={() => setCheckoutOpen(false)}>Close</button>
              </div>
              <div className="checkout-fields">
                <label>Full name<input value={checkoutData.name} onChange={(event) => setCheckoutData((previous) => ({ ...previous, name: event.target.value }))} required /></label>
                <label>Email<input type="email" value={checkoutData.email} onChange={(event) => setCheckoutData((previous) => ({ ...previous, email: event.target.value }))} /></label>
                <label>Contact<input value={checkoutData.contact} onChange={(event) => setCheckoutData((previous) => ({ ...previous, contact: event.target.value }))} /></label>
                <label>Address<input value={checkoutData.addressLine1} onChange={(event) => setCheckoutData((previous) => ({ ...previous, addressLine1: event.target.value }))} required /></label>
                <label>City<input value={checkoutData.city} onChange={(event) => setCheckoutData((previous) => ({ ...previous, city: event.target.value }))} required /></label>
                <label>Country<input value={checkoutData.country} onChange={(event) => setCheckoutData((previous) => ({ ...previous, country: event.target.value }))} required /></label>
              </div>
              <div className="checkout-total"><span>Total</span><strong>${total}</strong></div>
              <button type="submit" className="primary-button">Place order</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
