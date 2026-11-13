const express = require('express');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const models = require('./model');

const app = express();
const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.DB_NAME || 'paint_shop_inventory';
const allowedFields = ['sku', 'stockNumber', 'name', 'brand', 'color', 'colorCode', 'size', 'category', 'price', 'quantity'];
const orderStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
const sampleProducts = [
  { sku: 'CAN-08X10', stockNumber: 'CAN-0001', name: 'Stretched Canvas 8 x 10 in', brand: 'Studio Basics', size: '8 x 10 in', category: 'canvas', price: 6.99, quantity: 36 },
  { sku: 'CAN-16X20', stockNumber: 'CAN-0002', name: 'Stretched Canvas 16 x 20 in', brand: 'Studio Basics', size: '16 x 20 in', category: 'canvas', price: 14.99, quantity: 22 },
  { sku: 'CAN-PAD-9X12', stockNumber: 'CAN-0003', name: 'Canvas Pad 9 x 12 in', brand: 'Artworks', size: '9 x 12 in, 10 sheets', category: 'canvas', price: 11.5, quantity: 18 },
  { sku: 'ACR-SET-12', stockNumber: 'PNT-0001', name: 'Acrylic Paint Set, 12 Colors', brand: 'ColorField', size: '12 x 12 ml', category: 'paints', price: 18.99, quantity: 20 },
  { sku: 'ACR-TIT-WHT', stockNumber: 'PNT-0002', name: 'Acrylic Paint Titanium White', brand: 'ColorField', color: 'Titanium White', size: '120 ml', category: 'paints', price: 7.49, quantity: 31 },
  { sku: 'OIL-BLU-37', stockNumber: 'PNT-0003', name: 'Oil Paint Ultramarine Blue', brand: 'Fine Line', color: 'Ultramarine Blue', size: '37 ml', category: 'paints', price: 9.25, quantity: 14 },
  { sku: 'WAT-SET-24', stockNumber: 'PNT-0004', name: 'Watercolor Pan Set, 24 Colors', brand: 'Artworks', size: '24 pans', category: 'paints', price: 24.99, quantity: 16 },
  { sku: 'PEN-HB-12', stockNumber: 'PNC-0001', name: 'HB Graphite Pencils, 12 Pack', brand: 'Draftline', size: '12 pencils', category: 'pencils', price: 5.99, quantity: 40 },
  { sku: 'PEN-2B-6', stockNumber: 'PNC-0002', name: '2B Graphite Pencils, 6 Pack', brand: 'Draftline', size: '6 pencils', category: 'pencils', price: 4.5, quantity: 28 },
  { sku: 'PEN-CHAR-3', stockNumber: 'PNC-0003', name: 'Charcoal Pencils, 3 Pack', brand: 'Fine Line', size: '3 pencils', category: 'pencils', price: 8.25, quantity: 17 },
  { sku: 'BR-ROUND-6', stockNumber: 'BRU-0001', name: 'Round Paint Brushes, 6 Pack', brand: 'Studio Basics', size: 'Assorted sizes', category: 'brushes', price: 12.99, quantity: 25 },
  { sku: 'PAPR-WC-A4', stockNumber: 'PAP-0001', name: 'Watercolor Paper Pad A4', brand: 'Artworks', size: 'A4, 20 sheets', category: 'paper', price: 13.75, quantity: 19 },
];
const sampleCustomers = [
  { customerId: 'CUSTOMER-SAMPLE-001', customerName: 'Alex Example', address: '101 Sample Lane, Example City', contact: 'alex@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-002', customerName: 'Bailey Demo', address: '202 Sample Lane, Example City', contact: 'bailey@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-003', customerName: 'Casey Sample', address: '303 Sample Lane, Example City', contact: 'casey@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-004', customerName: 'Devon Test', address: '404 Sample Lane, Example City', contact: 'devon@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-005', customerName: 'Emery Example', address: '505 Sample Lane, Example City', contact: 'emery@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-006', customerName: 'Finley Demo', address: '606 Sample Lane, Example City', contact: 'finley@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-007', customerName: 'Gray Sample', address: '707 Sample Lane, Example City', contact: 'gray@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-008', customerName: 'Harper Test', address: '808 Sample Lane, Example City', contact: 'harper@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-009', customerName: 'Indigo Example', address: '909 Sample Lane, Example City', contact: 'indigo@example.test' },
  { customerId: 'CUSTOMER-SAMPLE-010', customerName: 'Jules Demo', address: '100 Sample Lane, Example City', contact: 'jules@example.test' },
];
const sampleOrders = [
  { orderId: 'ORDER-SAMPLE-001', customerId: 'CUSTOMER-SAMPLE-001', status: 'pending', productSku: 'CAN-08X10', quantity: 2 },
  { orderId: 'ORDER-SAMPLE-002', customerId: 'CUSTOMER-SAMPLE-002', status: 'processing', productSku: 'CAN-16X20', quantity: 1 },
  { orderId: 'ORDER-SAMPLE-003', customerId: 'CUSTOMER-SAMPLE-003', status: 'shipped', productSku: 'CAN-PAD-9X12', quantity: 3 },
  { orderId: 'ORDER-SAMPLE-004', customerId: 'CUSTOMER-SAMPLE-004', status: 'completed', productSku: 'ACR-SET-12', quantity: 1 },
  { orderId: 'ORDER-SAMPLE-005', customerId: 'CUSTOMER-SAMPLE-005', status: 'pending', productSku: 'ACR-TIT-WHT', quantity: 4 },
  { orderId: 'ORDER-SAMPLE-006', customerId: 'CUSTOMER-SAMPLE-006', status: 'processing', productSku: 'OIL-BLU-37', quantity: 2 },
  { orderId: 'ORDER-SAMPLE-007', customerId: 'CUSTOMER-SAMPLE-007', status: 'shipped', productSku: 'WAT-SET-24', quantity: 1 },
  { orderId: 'ORDER-SAMPLE-008', customerId: 'CUSTOMER-SAMPLE-008', status: 'completed', productSku: 'PEN-HB-12', quantity: 2 },
  { orderId: 'ORDER-SAMPLE-009', customerId: 'CUSTOMER-SAMPLE-009', status: 'pending', productSku: 'PEN-2B-6', quantity: 3 },
  { orderId: 'ORDER-SAMPLE-010', customerId: 'CUSTOMER-SAMPLE-010', status: 'processing', productSku: 'PEN-CHAR-3', quantity: 1 },
];

app.use(express.json());

function validateProduct(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'Request body must be a JSON object';
  }

  const product = {};
  for (const field of allowedFields) {
    if (Object.hasOwn(input, field)) product[field] = input[field];
  }

  if (!partial) {
    for (const field of ['sku', 'name']) {
      if (typeof product[field] !== 'string' || !product[field].trim()) {
        return `${field} is required and must be a non-empty string`;
      }
    }
  }

  for (const field of ['sku', 'stockNumber', 'name', 'brand', 'color', 'colorCode', 'size', 'category']) {
    if (Object.hasOwn(product, field)) {
      if (typeof product[field] !== 'string' || !product[field].trim()) {
        return `${field} must be a non-empty string`;
      }
      product[field] = product[field].trim();
    }
  }

  for (const field of ['price', 'quantity']) {
    if (Object.hasOwn(product, field)) {
      if (typeof product[field] !== 'number' || !Number.isFinite(product[field]) || product[field] < 0) {
        return `${field} must be a non-negative number`;
      }
    }
  }

  if (partial && Object.keys(product).length === 0) {
    return 'Provide at least one supported product field to update';
  }

  return product;
}

function getObjectId(id, response, resource = 'product') {
  if (!ObjectId.isValid(id)) {
    response.status(400).json({ error: `Invalid ${resource} id` });
    return null;
  }
  return new ObjectId(id);
}

function serializeProduct(product) {
  const { _id, ...fields } = product;
  return { productId: product.productId || _id.toString(), ...fields };
}

function serializeCustomer(customer) {
  const { _id, ...fields } = customer;
  return { customerId: customer.customerId || _id.toString(), ...fields };
}

function serializeOrder(order) {
  const { _id, ...fields } = order;
  return { orderId: order.orderId || _id.toString(), ...fields };
}

function serializeOrderDetail(detail) {
  const { _id, ...fields } = detail;
  return { orderDetailId: detail.orderDetailId || _id.toString(), ...fields };
}

app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});

function validateCustomer(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'Request body must be a JSON object';
  }

  const customer = {};
  for (const field of ['customerName', 'address', 'contact']) {
    if (Object.hasOwn(input, field)) customer[field] = input[field];
    if (!partial && (typeof customer[field] !== 'string' || !customer[field].trim())) {
      return `${field} is required and must be a non-empty string`;
    }
    if (Object.hasOwn(customer, field)) {
      if (typeof customer[field] !== 'string' || !customer[field].trim()) {
        return `${field} must be a non-empty string`;
      }
      customer[field] = customer[field].trim();
    }
  }

  if (partial && Object.keys(customer).length === 0) {
    return 'Provide at least one customer field to update';
  }
  return customer;
}

app.get('/api/customers', async (request, response, next) => {
  try {
    const customers = await request.app.locals.customers.find({}).sort({ customerName: 1 }).toArray();
    response.json(customers.map(serializeCustomer));
  } catch (error) {
    next(error);
  }
});

app.get('/api/customers/:customerId', async (request, response, next) => {
  try {
    const customer = await request.app.locals.customers.findOne({ customerId: request.params.customerId });
    if (!customer) return response.status(404).json({ error: 'Customer not found' });
    response.json(serializeCustomer(customer));
  } catch (error) {
    next(error);
  }
});

app.post('/api/customers', async (request, response, next) => {
  try {
    const customer = validateCustomer(request.body);
    if (typeof customer === 'string') return response.status(400).json({ error: customer });

    const id = new ObjectId();
    const now = new Date();
    const newCustomer = { ...customer, customerId: id.toString(), createdAt: now, updatedAt: now };
    await request.app.locals.customers.insertOne({ ...newCustomer, _id: id });
    response.status(201).json(serializeCustomer({ ...newCustomer, _id: id }));
  } catch (error) {
    next(error);
  }
});

app.put('/api/customers/:customerId', async (request, response, next) => {
  try {
    const customer = validateCustomer(request.body, true);
    if (typeof customer === 'string') return response.status(400).json({ error: customer });
    const result = await request.app.locals.customers.findOneAndUpdate(
      { customerId: request.params.customerId },
      { $set: { ...customer, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!result) return response.status(404).json({ error: 'Customer not found' });
    response.json(serializeCustomer(result));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/customers/:customerId', async (request, response, next) => {
  try {
    const customerId = request.params.customerId;
    if (await request.app.locals.orders.countDocuments({ customerId }) > 0) {
      return response.status(409).json({ error: 'Customer has orders and cannot be deleted' });
    }
    const result = await request.app.locals.customers.deleteOne({ customerId });
    if (result.deletedCount === 0) return response.status(404).json({ error: 'Customer not found' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/products', async (request, response, next) => {
  try {
    const filter = {};
    if (request.query.category) filter.category = request.query.category;
    if (request.query.q) {
      const escapedQuery = String(request.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { sku: { $regex: escapedQuery, $options: 'i' } },
        { stockNumber: { $regex: escapedQuery, $options: 'i' } },
        { brand: { $regex: escapedQuery, $options: 'i' } },
      ];
    }

    const products = await request.app.locals.products
      .find(filter)
      .sort({ name: 1 })
      .toArray();
    response.json(products.map(serializeProduct));
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:productId', async (request, response, next) => {
  try {
    const product = await request.app.locals.products.findOne({ productId: request.params.productId });
    if (!product) return response.status(404).json({ error: 'Product not found' });
    response.json(serializeProduct(product));
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', async (request, response, next) => {
  try {
    const product = validateProduct(request.body);
    if (typeof product === 'string') return response.status(400).json({ error: product });

    const now = new Date();
    const id = new ObjectId();
    const newProduct = {
      ...product,
      productId: id.toString(),
      stockNumber: product.stockNumber || product.sku,
      createdAt: now,
      updatedAt: now,
    };
    await request.app.locals.products.insertOne({ ...newProduct, _id: id });
    response.status(201).json(serializeProduct({ ...newProduct, _id: id }));
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:productId', async (request, response, next) => {
  try {
    const product = validateProduct(request.body, true);
    if (typeof product === 'string') return response.status(400).json({ error: product });

    const result = await request.app.locals.products.findOneAndUpdate(
      { productId: request.params.productId },
      { $set: { ...product, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!result) return response.status(404).json({ error: 'Product not found' });
    response.json(serializeProduct(result));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:productId', async (request, response, next) => {
  try {
    const productId = request.params.productId;
    if (await request.app.locals.orderDetails.countDocuments({ productId }) > 0) {
      return response.status(409).json({ error: 'Product appears in order details and cannot be deleted' });
    }
    const result = await request.app.locals.products.deleteOne({ productId });
    if (result.deletedCount === 0) return response.status(404).json({ error: 'Product not found' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

function validateOrder(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'Request body must be a JSON object';
  }
  const order = {};
  for (const field of ['customerId', 'status']) {
    if (Object.hasOwn(input, field)) order[field] = input[field];
  }
  if (!partial && (typeof order.customerId !== 'string' || !order.customerId.trim())) {
    return 'customerId is required and must be a non-empty string';
  }
  if (Object.hasOwn(order, 'customerId')) {
    if (typeof order.customerId !== 'string' || !order.customerId.trim()) return 'customerId must be a non-empty string';
    order.customerId = order.customerId.trim();
  }
  if (Object.hasOwn(order, 'status') && !orderStatuses.includes(order.status)) {
    return `status must be one of: ${orderStatuses.join(', ')}`;
  }
  if (partial && Object.keys(order).length === 0) return 'Provide customerId or status to update';
  return order;
}

function validateOrderDetail(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'Request body must be a JSON object';
  }
  const detail = {};
  for (const field of ['orderId', 'productId', 'quantity', 'unitPrice']) {
    if (Object.hasOwn(input, field)) detail[field] = input[field];
  }
  for (const field of ['orderId', 'productId']) {
    if (!partial && (typeof detail[field] !== 'string' || !detail[field].trim())) {
      return `${field} is required and must be a non-empty string`;
    }
    if (Object.hasOwn(detail, field)) {
      if (typeof detail[field] !== 'string' || !detail[field].trim()) return `${field} must be a non-empty string`;
      detail[field] = detail[field].trim();
    }
  }
  if (!partial && (!Number.isInteger(detail.quantity) || detail.quantity < 1)) {
    return 'quantity is required and must be a positive integer';
  }
  if (Object.hasOwn(detail, 'quantity') && (!Number.isInteger(detail.quantity) || detail.quantity < 1)) {
    return 'quantity must be a positive integer';
  }
  if (Object.hasOwn(detail, 'unitPrice') &&
      (typeof detail.unitPrice !== 'number' || !Number.isFinite(detail.unitPrice) || detail.unitPrice < 0)) {
    return 'unitPrice must be a non-negative number';
  }
  if (partial && Object.keys(detail).length === 0) return 'Provide an order detail field to update';
  return detail;
}

async function prepareOrderDetail(input, partial, collections, existing = null) {
  const detail = validateOrderDetail(input, partial);
  if (typeof detail === 'string') return { status: 400, error: detail };

  const orderId = detail.orderId || existing?.orderId;
  const productId = detail.productId || existing?.productId;
  const order = await collections.orders.findOne({ orderId });
  if (!order) return { status: 404, error: 'Referenced order was not found' };
  const product = await collections.products.findOne({ productId });
  if (!product) return { status: 404, error: 'Referenced product was not found' };

  return {
    ...detail,
    orderId,
    productId,
    unitPrice: Object.hasOwn(detail, 'unitPrice')
      ? detail.unitPrice
      : (productId === existing?.productId ? existing.unitPrice : product.price ?? 0),
  };
}

app.get('/api/orders', async (request, response, next) => {
  try {
    const filter = {};
    if (request.query.customerId) filter.customerId = request.query.customerId;
    if (request.query.status) filter.status = request.query.status;
    const orders = await request.app.locals.orders.find(filter).sort({ createdAt: -1 }).toArray();
    response.json(orders.map(serializeOrder));
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/:orderId', async (request, response, next) => {
  try {
    if (request.query.populate === 'true') {
      const order = await models.Order.findOne({ orderId: request.params.orderId })
        .populate('customer')
        .populate({ path: 'orderDetails', populate: { path: 'product' } });
      if (!order) return response.status(404).json({ error: 'Order not found' });

      return response.json({
        orderId: order.orderId,
        customerId: order.customerId,
        customer: order.customer ? {
          customerId: order.customer.customerId,
          customerName: order.customer.customerName,
          address: order.customer.address,
          contact: order.customer.contact,
        } : null,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        orderDetails: order.orderDetails.map((detail) => ({
          orderDetailId: detail.orderDetailId,
          orderId: detail.orderId,
          productId: detail.productId,
          quantity: detail.quantity,
          unitPrice: detail.unitPrice,
          product: detail.product ? {
            productId: detail.product.productId,
            sku: detail.product.sku,
            stockNumber: detail.product.stockNumber,
            name: detail.product.name,
            category: detail.product.category,
            price: detail.product.price,
          } : null,
        })),
      });
    }

    const order = await request.app.locals.orders.findOne({ orderId: request.params.orderId });
    if (!order) return response.status(404).json({ error: 'Order not found' });
    response.json(serializeOrder(order));
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (request, response, next) => {
  try {
    const order = validateOrder(request.body);
    if (typeof order === 'string') return response.status(400).json({ error: order });
    const customer = await request.app.locals.customers.findOne({ customerId: order.customerId });
    if (!customer) return response.status(404).json({ error: 'Referenced customer was not found' });

    const id = new ObjectId();
    const now = new Date();
    const newOrder = {
      ...order,
      orderId: id.toString(),
      status: order.status || 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await request.app.locals.orders.insertOne({ ...newOrder, _id: id });
    response.status(201).json(serializeOrder({ ...newOrder, _id: id }));
  } catch (error) {
    next(error);
  }
});

app.put('/api/orders/:orderId', async (request, response, next) => {
  try {
    const order = validateOrder(request.body, true);
    if (typeof order === 'string') return response.status(400).json({ error: order });
    if (order.customerId && !await request.app.locals.customers.findOne({ customerId: order.customerId })) {
      return response.status(404).json({ error: 'Referenced customer was not found' });
    }
    const result = await request.app.locals.orders.findOneAndUpdate(
      { orderId: request.params.orderId },
      { $set: { ...order, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!result) return response.status(404).json({ error: 'Order not found' });
    response.json(serializeOrder(result));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/orders/:orderId', async (request, response, next) => {
  try {
    const orderId = request.params.orderId;
    const order = await request.app.locals.orders.findOne({ orderId });
    if (!order) return response.status(404).json({ error: 'Order not found' });
    await request.app.locals.orderDetails.deleteMany({ orderId });
    await request.app.locals.orders.deleteOne({ orderId });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/order-details', async (request, response, next) => {
  try {
    const filter = {};
    if (request.query.orderId) filter.orderId = request.query.orderId;
    if (request.query.productId) filter.productId = request.query.productId;
    const details = await request.app.locals.orderDetails.find(filter).sort({ createdAt: 1 }).toArray();
    response.json(details.map(serializeOrderDetail));
  } catch (error) {
    next(error);
  }
});

app.get('/api/order-details/:orderDetailId', async (request, response, next) => {
  try {
    const detail = await request.app.locals.orderDetails.findOne({ orderDetailId: request.params.orderDetailId });
    if (!detail) return response.status(404).json({ error: 'Order detail not found' });
    response.json(serializeOrderDetail(detail));
  } catch (error) {
    next(error);
  }
});

app.post('/api/order-details', async (request, response, next) => {
  try {
    const detail = await prepareOrderDetail(request.body, false, request.app.locals);
    if (detail.error) return response.status(detail.status).json({ error: detail.error });
    const id = new ObjectId();
    const now = new Date();
    const newDetail = { ...detail, orderDetailId: id.toString(), createdAt: now, updatedAt: now };
    await request.app.locals.orderDetails.insertOne({ ...newDetail, _id: id });
    response.status(201).json(serializeOrderDetail({ ...newDetail, _id: id }));
  } catch (error) {
    next(error);
  }
});

app.put('/api/order-details/:orderDetailId', async (request, response, next) => {
  try {
    const existing = await request.app.locals.orderDetails.findOne({ orderDetailId: request.params.orderDetailId });
    if (!existing) return response.status(404).json({ error: 'Order detail not found' });
    const detail = await prepareOrderDetail(request.body, true, request.app.locals, existing);
    if (detail.error) return response.status(detail.status).json({ error: detail.error });
    const result = await request.app.locals.orderDetails.findOneAndUpdate(
      { orderDetailId: request.params.orderDetailId },
      { $set: { ...detail, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    response.json(serializeOrderDetail(result));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/order-details/:orderDetailId', async (request, response, next) => {
  try {
    const result = await request.app.locals.orderDetails.deleteOne({ orderDetailId: request.params.orderDetailId });
    if (result.deletedCount === 0) return response.status(404).json({ error: 'Order detail not found' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, request, response, next) => {
  if (error.code === 11000) {
    return response.status(409).json({ error: 'A product with that SKU or stock number already exists' });
  }
  if (error instanceof SyntaxError && Object.hasOwn(error, 'body')) {
    return response.status(400).json({ error: 'Request body contains invalid JSON' });
  }
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await mongoose.connect(mongoUri, { dbName: databaseName, autoIndex: false });
  const database = mongoose.connection.db;
  app.locals.products = database.collection('products');
  app.locals.customers = database.collection('customers');
  app.locals.orders = database.collection('orders');
  app.locals.orderDetails = database.collection('orderDetails');
  await app.locals.products.createIndex({ sku: 1 }, { unique: true });
  await app.locals.products.createIndex({ stockNumber: 1 }, { unique: true, sparse: true });
  await app.locals.products.bulkWrite(sampleProducts.map((product) => ({
    updateOne: {
      filter: { sku: product.sku },
      update: { $setOnInsert: { ...product, createdAt: new Date(), updatedAt: new Date() } },
      upsert: true,
    },
  })));
  const productsWithoutProductId = await app.locals.products
    .find({ productId: { $exists: false } }, { projection: { _id: 1 } })
    .toArray();
  if (productsWithoutProductId.length > 0) {
    await app.locals.products.bulkWrite(productsWithoutProductId.map((product) => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { productId: product._id.toString() } },
      },
    })));
  }
  await app.locals.products.createIndex({ productId: 1 }, { unique: true });

  const legacyOrders = await app.locals.orders.find({
    $or: [{ orderId: { $exists: false } }, { items: { $exists: true } }],
  }).toArray();
  for (const legacyOrder of legacyOrders) {
    const orderId = legacyOrder.orderId || legacyOrder._id.toString();
    const customerId = legacyOrder.customerId || `legacy-${orderId}`;
    const now = new Date();
    await app.locals.customers.updateOne(
      { customerId },
      {
        $setOnInsert: {
          customerId,
          customerName: legacyOrder.customerName || 'Legacy customer',
          address: legacyOrder.address || 'Not provided',
          contact: legacyOrder.contact || 'Not provided',
          createdAt: legacyOrder.createdAt || now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    const oldItems = Array.isArray(legacyOrder.items) ? legacyOrder.items : [];
    for (const [index, item] of oldItems.entries()) {
      const productId = item.productId instanceof ObjectId ? item.productId.toString() : String(item.productId);
      const orderDetailId = `${orderId}-${index + 1}`;
      await app.locals.orderDetails.updateOne(
        { orderDetailId },
        {
          $setOnInsert: {
            orderDetailId,
            orderId,
            productId,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice ?? 0,
            createdAt: legacyOrder.createdAt || now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
    }

    await app.locals.orders.updateOne(
      { _id: legacyOrder._id },
      {
        $set: {
          orderId,
          customerId,
          status: legacyOrder.status || 'pending',
          updatedAt: now,
        },
        $unset: { customerName: '', address: '', contact: '', items: '' },
      },
    );
  }

  await app.locals.customers.createIndex({ customerId: 1 }, { unique: true });
  await app.locals.orders.createIndex({ orderId: 1 }, { unique: true });
  await app.locals.orders.createIndex({ customerId: 1 });
  await app.locals.orderDetails.createIndex({ orderDetailId: 1 }, { unique: true });
  await app.locals.orderDetails.createIndex({ orderId: 1 });
  await app.locals.orderDetails.createIndex({ productId: 1 });

  const seedTime = new Date();
  await app.locals.customers.bulkWrite(sampleCustomers.map((customer) => ({
    updateOne: {
      filter: { customerId: customer.customerId },
      update: { $setOnInsert: { ...customer, createdAt: seedTime, updatedAt: seedTime } },
      upsert: true,
    },
  })));
  await app.locals.orders.bulkWrite(sampleOrders.map((order) => ({
    updateOne: {
      filter: { orderId: order.orderId },
      update: {
        $setOnInsert: {
          orderId: order.orderId,
          customerId: order.customerId,
          status: order.status,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
      },
      upsert: true,
    },
  })));

  const seededProducts = await app.locals.products
    .find({ sku: { $in: sampleOrders.map((order) => order.productSku) } })
    .toArray();
  const productsBySku = new Map(seededProducts.map((product) => [product.sku, product]));
  for (const [index, order] of sampleOrders.entries()) {
    const product = productsBySku.get(order.productSku);
    if (!product) throw new Error(`Missing sample product ${order.productSku}`);
    const orderDetailId = `ORDER-DETAIL-SAMPLE-${String(index + 1).padStart(3, '0')}`;
    await app.locals.orderDetails.updateOne(
      { orderDetailId },
      {
        $setOnInsert: {
          orderDetailId,
          orderId: order.orderId,
          productId: product.productId,
          quantity: order.quantity,
          unitPrice: product.price ?? 0,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
      },
      { upsert: true },
    );
  }

  app.listen(port, () => {
    console.log(`Paint shop inventory API listening on http://localhost:${port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  }
}

start().catch((error) => {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
});