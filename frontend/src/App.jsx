import { useState } from 'react'
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

const initialProducts = [
  {
    id: 1,
    name: 'Acrylic Studio Set',
    category: 'Paints',
    price: 42,
    stock: 18,
    rating: 4.9,
    description: 'High-pigment acrylics for bold textures and layered color work.',
    symbol: '🎨',
    tint: accentOptions[0].value,
  },
  {
    id: 2,
    name: 'Watercolor Essentials',
    category: 'Paints',
    price: 36,
    stock: 12,
    rating: 4.7,
    description: 'Pocket-friendly watercolor starter kit with rich, blendable pigments.',
    symbol: '🎨',
    tint: accentOptions[1].value,
  },
  {
    id: 3,
    name: 'Canvas Pack Pro',
    category: 'Canvas',
    price: 58,
    stock: 9,
    rating: 4.8,
    description: 'Pre-gessoed canvases for gallery-ready paintings and practice work.',
    symbol: '📄',
    tint: accentOptions[2].value,
  },
  {
    id: 4,
    name: 'Brush Master Kit',
    category: 'Tools',
    price: 28,
    stock: 21,
    rating: 4.6,
    description: 'A balanced set of detail and wash brushes for smooth, precise strokes.',
    symbol: '🖌️',
    tint: accentOptions[3].value,
  },
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
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Products' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'customer orders', label: 'Customer Orders' },
]

const initialOrders = [
  {
    id: 1,
    customerName: 'Alicia M.',
    items: [
      { id: 1, name: 'Acrylic Studio Set', qty: 1, price: 42 },
      { id: 3, name: 'Canvas Pack Pro', qty: 1, price: 58 },
    ],
    total: 100,
    status: 'Ready to ship',
  },
  {
    id: 2,
    customerName: 'Theo R.',
    items: [{ id: 4, name: 'Brush Master Kit', qty: 2, price: 28 }],
    total: 56,
    status: 'Processing',
  },
]

function App() {
  const [products, setProducts] = useState(initialProducts)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState([
    { id: 1, qty: 1 },
    { id: 3, qty: 2 },
  ])
  const [formData, setFormData] = useState(defaultForm)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [orders, setOrders] = useState(initialOrders)

  const categories = ['All', ...new Set(products.map((product) => product.category))]

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

  const handleSubmit = (event) => {
    event.preventDefault()

    const productData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      stock: Number(formData.stock),
      rating: 4.8,
    }

    if (!productData.name || !productData.description || !productData.price || !productData.stock) {
      return
    }

    if (editingId) {
      setProducts((previous) =>
        previous.map((product) =>
          product.id === editingId ? { ...product, ...productData, id: editingId } : product,
        ),
      )
    } else {
      const newProduct = {
        ...productData,
        id: Date.now(),
        symbol: formData.symbol || '🎨',
        tint: formData.tint || 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
      }

      setProducts((previous) => [newProduct, ...previous])
    }

    resetForm()
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

  const handleDelete = (productId) => {
    setProducts((previous) => previous.filter((product) => product.id !== productId))
    setCart((previous) => previous.filter((item) => item.id !== productId))

    if (editingId === productId) {
      resetForm()
    }
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      window.alert('Your cart is empty.')
      return
    }

    const customerName = window.prompt('Please enter your name for this order:')

    if (!customerName || !customerName.trim()) {
      return
    }

    const newOrder = {
      id: Date.now(),
      customerName: customerName.trim(),
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
      })),
      total: total,
      status: 'Processing',
    }

    setOrders((previous) => [newOrder, ...previous])
    setCart([])
  }

  const handleOrderStatusChange = (orderId, nextStatus) => {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order,
      ),
    )
  }

  const handleOrderDelete = (orderId) => {
    setOrders((previous) => previous.filter((order) => order.id !== orderId))
  }

  return (
    <div className="app-shell admin-layout">
      <aside className="left-sidebar">
        <div className="brand-block sidebar-brand">
          <div className="brand-mark">P</div>
          <div>
            <p className="eyebrow">Art marketplace</p>
            <h1>Pintura De Mercado</h1>
          </div>
        </div>

        <nav className="side-nav" aria-label="Sidebar navigation">
          {navTabs.map((tab) => (
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
      </aside>

      <div className="workspace-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Store overview</p>
            <h2>{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'products' ? 'Products' : activeTab === 'inventory' ? 'Inventory' : 'Customer Orders'}</h2>
          </div>

          <button type="button" className="primary-button cart-button" onClick={handleCheckout}>
            Cart ({cart.length})
          </button>
        </header>

        {activeTab === 'dashboard' && (
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
                  {categories.map((category) => (
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
                      <select
                        value={order.status}
                        onChange={(event) => handleOrderStatusChange(order.id, event.target.value)}
                      >
                        <option value="Processing">Processing</option>
                        <option value="Ready to ship">Ready to ship</option>
                        <option value="Shipped">Shipped</option>
                      </select>

                      <button type="button" className="danger-button small-button" onClick={() => handleOrderDelete(order.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

export default App
