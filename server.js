const express = require('express');
const mongoose = require('mongoose');
const {
  Customer,
  Address,
  Category,
  Product,
  ProductVariant,
  Order,
  OrderItem,
  InventoryMovement,
} = require('./model');

//THIS IS A TEST


const app = express();
const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.DB_NAME || 'paint_shop_inventory_v2';
const orderStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fail(status, message) {
  throw new HttpError(status, message);
}

function newId() {
  return new mongoose.Types.ObjectId().toString();
}

function bodyOf(request) {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    fail(400, 'Request body must be a JSON object');
  }
  return request.body;
}

function allowFields(body, fields) {
  const unexpected = Object.keys(body).find((field) => !fields.includes(field));
  if (unexpected) fail(400, `Unsupported field: ${unexpected}`);
}

function text(body, field, { required = false, allowEmpty = false } = {}) {
  if (!Object.hasOwn(body, field)) {
    if (required) fail(400, `${field} is required`);
    return undefined;
  }
  if (typeof body[field] !== 'string') fail(400, `${field} must be a string`);
  const value = body[field].trim();
  if (!allowEmpty && !value) fail(400, `${field} must not be empty`);
  return value;
}

function number(body, field, { required = false, integer = false, min = 0 } = {}) {
  if (!Object.hasOwn(body, field)) {
    if (required) fail(400, `${field} is required`);
    return undefined;
  }
  const value = body[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || (integer && !Number.isInteger(value))) {
    fail(400, `${field} must be a ${integer ? 'whole ' : ''}number greater than or equal to ${min}`);
  }
  return value;
}

function optionalBoolean(body, field, fallback) {
  if (!Object.hasOwn(body, field)) return fallback;
  if (typeof body[field] !== 'boolean') fail(400, `${field} must be a boolean`);
  return body[field];
}

async function ensureExists(Model, key, value, label) {
  if (!await Model.exists({ [key]: value })) fail(404, `${label} not found`);
}

async function getById(Model, key, value, label) {
  const record = await Model.findOne({ [key]: value });
  if (!record) fail(404, `${label} not found`);
  return record;
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function ensureCategoryParent(categoryId, parentCategoryId) {
  if (!parentCategoryId) return;
  let currentId = parentCategoryId;
  const visited = new Set();
  while (currentId) {
    if (currentId === categoryId) fail(400, 'A category cannot be its own ancestor');
    if (visited.has(currentId)) fail(400, 'The parent category chain contains a cycle');
    visited.add(currentId);
    const parent = await Category.findOne({ categoryId: currentId }).select('parentCategoryId');
    if (!parent) fail(404, 'Parent category not found');
    currentId = parent.parentCategoryId;
  }
}

async function applyStockChange({ variantId, delta, type, reason, orderId }) {
  const filter = { variantId };
  if (delta < 0) filter.stockOnHand = { $gte: -delta };
  const variant = await ProductVariant.findOneAndUpdate(
    filter,
    { $inc: { stockOnHand: delta } },
    { new: true, runValidators: true },
  );
  if (!variant) {
    if (!await ProductVariant.exists({ variantId })) fail(404, 'Product variant not found');
    fail(409, 'Insufficient stock for this inventory change');
  }

  try {
    const movement = await InventoryMovement.create({
      movementId: newId(),
      variantId,
      type,
      quantityDelta: delta,
      reason,
      ...(orderId ? { orderId } : {}),
    });
    return { variant, movement };
  } catch (error) {
    try {
      await ProductVariant.updateOne({ variantId }, { $inc: { stockOnHand: -delta } });
    } catch (rollbackError) {
      console.error('Stock rollback failed after movement insert error:', rollbackError);
    }
    throw error;
  }
}

app.use(express.json({ limit: '1mb' }));

app.get('/health', (request, response) => {
  response.json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'starting' });
});

app.get('/api/customers', async (request, response) => {
  response.json(await Customer.find({}).sort({ customerName: 1 }).limit(200));
});

app.post('/api/customers', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['customerName', 'email', 'contact']);
  const customerName = text(body, 'customerName', { required: true });
  const email = text(body, 'email');
  const contact = text(body, 'contact', { allowEmpty: true });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'email must be a valid email address');
  const customer = await Customer.create({
    customerId: newId(),
    customerName,
    ...(email ? { email: email.toLowerCase() } : {}),
    ...(contact !== undefined ? { contact } : {}),
  });
  response.status(201).json(customer);
});

app.get('/api/customers/:customerId', async (request, response) => {
  response.json(await getById(Customer, 'customerId', request.params.customerId, 'Customer'));
});

app.put('/api/customers/:customerId', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['customerName', 'email', 'contact']);
  const updates = {};
  for (const field of ['customerName', 'email', 'contact']) {
    if (Object.hasOwn(body, field)) updates[field] = text(body, field, { allowEmpty: field === 'contact' });
  }
  if (!Object.keys(updates).length) fail(400, 'Provide at least one customer field to update');
  if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) fail(400, 'email must be a valid email address');
  if (updates.email) updates.email = updates.email.toLowerCase();
  const customer = await Customer.findOneAndUpdate(
    { customerId: request.params.customerId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!customer) fail(404, 'Customer not found');
  response.json(customer);
});

app.delete('/api/customers/:customerId', async (request, response) => {
  const { customerId } = request.params;
  if (await Order.exists({ customerId }) || await Address.exists({ customerId })) {
    fail(409, 'Customer has addresses or orders and cannot be deleted');
  }
  const result = await Customer.deleteOne({ customerId });
  if (!result.deletedCount) fail(404, 'Customer not found');
  response.status(204).end();
});

const addressFields = ['label', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'country'];

function addressInput(body, partial = false) {
  allowFields(body, partial ? addressFields : ['customerId', ...addressFields]);
  const address = {};
  for (const field of addressFields) {
    const required = ['addressLine1', 'city', 'country'].includes(field) && !partial;
    if (Object.hasOwn(body, field) || required) {
      address[field] = text(body, field, { required, allowEmpty: ['label', 'addressLine2', 'region', 'postalCode'].includes(field) });
    }
  }
  return address;
}

app.get('/api/customers/:customerId/addresses', async (request, response) => {
  await ensureExists(Customer, 'customerId', request.params.customerId, 'Customer');
  response.json(await Address.find({ customerId: request.params.customerId }).sort({ createdAt: 1 }));
});

app.post('/api/customers/:customerId/addresses', async (request, response) => {
  const body = bodyOf(request);
  await ensureExists(Customer, 'customerId', request.params.customerId, 'Customer');
  const address = addressInput(body, true);
  if (!address.addressLine1 || !address.city || !address.country) {
    fail(400, 'addressLine1, city, and country are required');
  }
  const created = await Address.create({
    ...address,
    customerId: request.params.customerId,
    addressId: newId(),
  });
  response.status(201).json(created);
});

app.get('/api/addresses/:addressId', async (request, response) => {
  response.json(await getById(Address, 'addressId', request.params.addressId, 'Address'));
});

app.put('/api/addresses/:addressId', async (request, response) => {
  const body = bodyOf(request);
  const updates = addressInput(body, true);
  if (!Object.keys(updates).length) fail(400, 'Provide at least one address field to update');
  const address = await Address.findOneAndUpdate(
    { addressId: request.params.addressId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!address) fail(404, 'Address not found');
  response.json(address);
});

app.delete('/api/addresses/:addressId', async (request, response) => {
  const { addressId } = request.params;
  if (await Order.exists({ addressId })) fail(409, 'Address is referenced by an order and cannot be deleted');
  const result = await Address.deleteOne({ addressId });
  if (!result.deletedCount) fail(404, 'Address not found');
  response.status(204).end();
});

app.get('/api/categories', async (request, response) => {
  response.json(await Category.find({}).sort({ name: 1 }).limit(200));
});

app.post('/api/categories', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['name', 'slug', 'parentCategoryId']);
  const name = text(body, 'name', { required: true });
  const slug = body.slug === undefined ? slugify(name) : slugify(text(body, 'slug', { required: true }));
  if (!slug) fail(400, 'slug must contain letters or numbers');
  const parentCategoryId = body.parentCategoryId === undefined || body.parentCategoryId === null
    ? null
    : text(body, 'parentCategoryId', { required: true });
  await ensureCategoryParent(null, parentCategoryId);
  const category = await Category.create({ categoryId: newId(), name, slug, parentCategoryId });
  response.status(201).json(category);
});

app.get('/api/categories/:categoryId', async (request, response) => {
  response.json(await getById(Category, 'categoryId', request.params.categoryId, 'Category'));
});

app.put('/api/categories/:categoryId', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['name', 'slug', 'parentCategoryId']);
  const { categoryId } = request.params;
  const updates = {};
  if (Object.hasOwn(body, 'name')) updates.name = text(body, 'name', { required: true });
  if (Object.hasOwn(body, 'slug')) updates.slug = slugify(text(body, 'slug', { required: true }));
  if (Object.hasOwn(body, 'parentCategoryId')) {
    updates.parentCategoryId = body.parentCategoryId === null
      ? null
      : text(body, 'parentCategoryId', { required: true });
    await ensureCategoryParent(categoryId, updates.parentCategoryId);
  }
  if (!Object.keys(updates).length) fail(400, 'Provide at least one category field to update');
  if (updates.slug === '') fail(400, 'slug must contain letters or numbers');
  const category = await Category.findOneAndUpdate(
    { categoryId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!category) fail(404, 'Category not found');
  response.json(category);
});

app.delete('/api/categories/:categoryId', async (request, response) => {
  const { categoryId } = request.params;
  if (await Product.exists({ categoryId }) || await Category.exists({ parentCategoryId: categoryId })) {
    fail(409, 'Category has products or child categories and cannot be deleted');
  }
  const result = await Category.deleteOne({ categoryId });
  if (!result.deletedCount) fail(404, 'Category not found');
  response.status(204).end();
});

app.get('/api/products', async (request, response) => {
  const filter = {};
  if (request.query.categoryId) filter.categoryId = String(request.query.categoryId);
  if (request.query.q) {
    const query = String(request.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: query, $options: 'i' } },
      { brand: { $regex: query, $options: 'i' } },
    ];
  }
  response.json(await Product.find(filter).sort({ name: 1 }).limit(200));
});

app.post('/api/products', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['name', 'description', 'brand', 'categoryId']);
  const categoryId = text(body, 'categoryId', { required: true });
  await ensureExists(Category, 'categoryId', categoryId, 'Category');
  const product = await Product.create({
    productId: newId(),
    name: text(body, 'name', { required: true }),
    categoryId,
    ...(Object.hasOwn(body, 'description') ? { description: text(body, 'description', { allowEmpty: true }) } : {}),
    ...(Object.hasOwn(body, 'brand') ? { brand: text(body, 'brand', { allowEmpty: true }) } : {}),
  });
  response.status(201).json(product);
});

app.get('/api/products/:productId', async (request, response) => {
  const product = await Product.findOne({ productId: request.params.productId }).populate('category').populate('variants');
  if (!product) fail(404, 'Product not found');
  response.json(product);
});

app.put('/api/products/:productId', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['name', 'description', 'brand', 'categoryId']);
  const updates = {};
  for (const field of ['name', 'description', 'brand', 'categoryId']) {
    if (Object.hasOwn(body, field)) updates[field] = text(body, field, { required: field === 'name' || field === 'categoryId', allowEmpty: field === 'description' || field === 'brand' });
  }
  if (!Object.keys(updates).length) fail(400, 'Provide at least one product field to update');
  if (updates.categoryId) await ensureExists(Category, 'categoryId', updates.categoryId, 'Category');
  const product = await Product.findOneAndUpdate(
    { productId: request.params.productId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!product) fail(404, 'Product not found');
  response.json(product);
});

app.delete('/api/products/:productId', async (request, response) => {
  const { productId } = request.params;
  if (await ProductVariant.exists({ productId })) fail(409, 'Product has variants and cannot be deleted');
  const result = await Product.deleteOne({ productId });
  if (!result.deletedCount) fail(404, 'Product not found');
  response.status(204).end();
});

const variantTextFields = ['sku', 'color', 'colorCode', 'finish', 'volume', 'size'];

function variantInput(body, partial = false) {
  allowFields(body, [...variantTextFields, 'price', 'active', ...(partial ? [] : ['productId'])]);
  const variant = {};
  for (const field of variantTextFields) {
    if (Object.hasOwn(body, field) || (!partial && field === 'sku')) {
      variant[field] = text(body, field, { required: field === 'sku', allowEmpty: field !== 'sku' });
    }
  }
  if (Object.hasOwn(body, 'price') || !partial) variant.price = number(body, 'price', { required: !partial });
  if (Object.hasOwn(body, 'active')) variant.active = optionalBoolean(body, 'active', true);
  if (!partial) variant.productId = text(body, 'productId', { required: true });
  if (partial && !Object.keys(variant).length) fail(400, 'Provide at least one variant field to update');
  return variant;
}

app.get('/api/variants', async (request, response) => {
  const filter = {};
  if (request.query.productId) filter.productId = String(request.query.productId);
  if (request.query.active !== undefined) filter.active = String(request.query.active) === 'true';
  response.json(await ProductVariant.find(filter).sort({ sku: 1 }).limit(200));
});

app.post('/api/variants', async (request, response) => {
  const body = bodyOf(request);
  const variant = variantInput(body);
  await ensureExists(Product, 'productId', variant.productId, 'Product');
  const created = await ProductVariant.create({ ...variant, variantId: newId(), stockOnHand: 0 });
  response.status(201).json(created);
});

app.get('/api/variants/:variantId', async (request, response) => {
  const variant = await ProductVariant.findOne({ variantId: request.params.variantId }).populate('product');
  if (!variant) fail(404, 'Product variant not found');
  response.json(variant);
});

app.put('/api/variants/:variantId', async (request, response) => {
  const variant = variantInput(bodyOf(request), true);
  if (variant.productId) await ensureExists(Product, 'productId', variant.productId, 'Product');
  const updated = await ProductVariant.findOneAndUpdate(
    { variantId: request.params.variantId },
    { $set: variant },
    { new: true, runValidators: true },
  );
  if (!updated) fail(404, 'Product variant not found');
  response.json(updated);
});

app.delete('/api/variants/:variantId', async (request, response) => {
  const { variantId } = request.params;
  if (await OrderItem.exists({ variantId }) || await InventoryMovement.exists({ variantId })) {
    fail(409, 'Variant has order or inventory history and cannot be deleted');
  }
  const result = await ProductVariant.deleteOne({ variantId });
  if (!result.deletedCount) fail(404, 'Product variant not found');
  response.status(204).end();
});

app.get('/api/inventory-movements', async (request, response) => {
  const filter = {};
  if (request.query.variantId) filter.variantId = String(request.query.variantId);
  if (request.query.orderId) filter.orderId = String(request.query.orderId);
  response.json(await InventoryMovement.find(filter).sort({ createdAt: -1 }).limit(200));
});

app.post('/api/inventory-movements', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['variantId', 'type', 'quantityDelta', 'reason']);
  const variantId = text(body, 'variantId', { required: true });
  const type = text(body, 'type', { required: true });
  const quantityDelta = number(body, 'quantityDelta', { required: true, integer: true, min: -Number.MAX_SAFE_INTEGER });
  const reason = text(body, 'reason', { required: true });
  if (!['receipt', 'adjustment', 'return'].includes(type)) {
    fail(400, 'type must be receipt, adjustment, or return');
  }
  if (quantityDelta === 0) fail(400, 'quantityDelta must not be zero');
  if (type !== 'adjustment' && quantityDelta < 0) {
    fail(400, `${type} movements must have a positive quantityDelta`);
  }
  const result = await applyStockChange({ variantId, delta: quantityDelta, type, reason });
  response.status(201).json({ variant: result.variant, movement: result.movement });
});

app.get('/api/orders', async (request, response) => {
  const filter = {};
  if (request.query.customerId) filter.customerId = String(request.query.customerId);
  if (request.query.status) {
    if (!orderStatuses.includes(String(request.query.status))) fail(400, 'Invalid order status');
    filter.status = String(request.query.status);
  }
  response.json(await Order.find(filter).sort({ createdAt: -1 }).limit(200));
});

app.post('/api/orders', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['customerId', 'addressId', 'items']);
  const customerId = text(body, 'customerId', { required: true });
  const addressId = text(body, 'addressId', { required: true });
  if (!Array.isArray(body.items) || body.items.length === 0) fail(400, 'items must be a non-empty array');
  if (body.items.length > 100) fail(400, 'An order cannot contain more than 100 items');

  await ensureExists(Customer, 'customerId', customerId, 'Customer');
  const address = await Address.findOne({ addressId, customerId });
  if (!address) fail(404, 'Address not found for this customer');

  const requestedItems = body.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail(400, 'Each order item must be an object');
    allowFields(item, ['variantId', 'quantity']);
    return {
      variantId: text(item, 'variantId', { required: true }),
      quantity: number(item, 'quantity', { required: true, integer: true, min: 1 }),
    };
  });
  if (new Set(requestedItems.map((item) => item.variantId)).size !== requestedItems.length) {
    fail(400, 'Each variant may appear only once in an order');
  }

  const orderId = newId();
  const items = [];
  for (const requested of requestedItems) {
    const variant = await ProductVariant.findOne({ variantId: requested.variantId, active: true }).populate('product');
    if (!variant || !variant.product) fail(404, 'An active product variant was not found');
    if (variant.stockOnHand < requested.quantity) fail(409, `Insufficient stock for SKU ${variant.sku}`);
    items.push({
      ...requested,
      productId: variant.productId,
      productName: variant.product.name,
      sku: variant.sku,
      variantDescription: [variant.color, variant.finish, variant.volume, variant.size].filter(Boolean).join(', '),
      unitPrice: variant.price,
      lineTotal: Number((variant.price * requested.quantity).toFixed(2)),
    });
  }
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const addressSnapshot = {
    label: address.label,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    country: address.country,
  };
  const reserved = [];
  let orderCreated = false;

  try {
    await Order.create({ orderId, customerId, addressId, shippingAddress: addressSnapshot, subtotal });
    orderCreated = true;
    await OrderItem.insertMany(items.map((item) => ({ ...item, orderItemId: newId(), orderId })));
    for (const item of items) {
      await applyStockChange({
        variantId: item.variantId,
        delta: -item.quantity,
        type: 'sale',
        reason: `Reserved for order ${orderId}`,
        orderId,
      });
      reserved.push(item);
    }
  } catch (error) {
    let rollbackSucceeded = true;
    for (const item of reserved.reverse()) {
      try {
        await applyStockChange({
          variantId: item.variantId,
          delta: item.quantity,
          type: 'cancellation',
          reason: `Order ${orderId} creation rollback`,
          orderId,
        });
      } catch (rollbackError) {
        rollbackSucceeded = false;
        console.error(`Stock rollback failed for order ${orderId}:`, rollbackError);
      }
    }
    if (rollbackSucceeded) {
      try {
        await OrderItem.deleteMany({ orderId });
        await InventoryMovement.deleteMany({ orderId });
        if (orderCreated) await Order.deleteOne({ orderId });
      } catch (cleanupError) {
        console.error(`Order cleanup failed for ${orderId}:`, cleanupError);
        if (orderCreated) await Order.updateOne({ orderId }, { $set: { status: 'cancelled' } });
      }
    } else if (orderCreated) {
      await Order.updateOne({ orderId }, { $set: { status: 'cancelled' } });
    }
    throw error;
  }

  const order = await Order.findOne({ orderId }).populate('items');
  response.status(201).json(order);
});

app.get('/api/orders/:orderId', async (request, response) => {
  const order = await Order.findOne({ orderId: request.params.orderId })
    .populate('customer')
    .populate('items');
  if (!order) fail(404, 'Order not found');
  response.json(order);
});

app.patch('/api/orders/:orderId', async (request, response) => {
  const body = bodyOf(request);
  allowFields(body, ['status']);
  const status = text(body, 'status', { required: true });
  if (!orderStatuses.includes(status)) fail(400, `status must be one of: ${orderStatuses.join(', ')}`);
  const order = await getById(Order, 'orderId', request.params.orderId, 'Order');
  const transitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['completed'],
    completed: [],
    cancelled: [],
  };
  if (!transitions[order.status].includes(status)) {
    fail(409, `Cannot change order status from ${order.status} to ${status}`);
  }

  const updated = await Order.findOneAndUpdate(
    { orderId: order.orderId, status: order.status },
    { $set: { status } },
    { new: true, runValidators: true },
  );
  if (!updated) fail(409, 'Order status changed concurrently; reload and try again');

  if (status === 'cancelled') {
    const items = await OrderItem.find({ orderId: order.orderId });
    const restored = [];
    try {
      for (const item of items) {
        await applyStockChange({
          variantId: item.variantId,
          delta: item.quantity,
          type: 'cancellation',
          reason: `Restocked from cancelled order ${order.orderId}`,
          orderId: order.orderId,
        });
        restored.push(item);
      }
    } catch (error) {
      for (const item of restored.reverse()) {
        try {
          await applyStockChange({
            variantId: item.variantId,
            delta: -item.quantity,
            type: 'adjustment',
            reason: `Cancellation rollback for order ${order.orderId}`,
            orderId: order.orderId,
          });
        } catch (rollbackError) {
          console.error(`Cancellation stock rollback failed for order ${order.orderId}:`, rollbackError);
        }
      }
      await Order.updateOne({ orderId: order.orderId, status: 'cancelled' }, { $set: { status: order.status } });
      throw error;
    }
  }
  response.json(updated);
});

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error instanceof HttpError) return response.status(error.status).json({ error: error.message });
  if (error instanceof SyntaxError && Object.hasOwn(error, 'body')) {
    return response.status(400).json({ error: 'Request body contains invalid JSON' });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return response.status(409).json({ error: `A record with that ${field || 'unique value'} already exists` });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return response.status(400).json({ error: error.message });
  }
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await mongoose.connect(mongoUri, { dbName: databaseName });
  const server = app.listen(port, () => {
    console.log(`Paint shop inventory API listening on http://localhost:${port}`);
    console.log(`MongoDB database: ${databaseName}`);
  });

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    server.close(async (error) => {
      if (error) console.error('HTTP server shutdown failed:', error);
      await mongoose.disconnect();
      process.exit(error ? 1 : 0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Could not start the API:', error.message);
  process.exitCode = 1;
});
