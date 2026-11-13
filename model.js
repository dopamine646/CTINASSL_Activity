const mongoose = require('mongoose');

const { Schema } = mongoose;

const customerSchema = new Schema({
  customerId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  address: { type: String, required: true },
  contact: { type: String, required: true },
  createdAt: Date,
  updatedAt: Date,
}, { collection: 'customers', versionKey: false });

const productSchema = new Schema({
  productId: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true },
  stockNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  brand: String,
  color: String,
  colorCode: String,
  size: String,
  category: { type: String, required: true },
  price: { type: Number, min: 0 },
  quantity: { type: Number, min: 0 },
  createdAt: Date,
  updatedAt: Date,
}, { collection: 'products', versionKey: false });

const orderSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled'] },
  createdAt: Date,
  updatedAt: Date,
}, { collection: 'orders', versionKey: false });

const orderDetailSchema = new Schema({
  orderDetailId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  productId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  createdAt: Date,
  updatedAt: Date,
}, { collection: 'orderDetails', versionKey: false });

customerSchema.virtual('orders', {
  ref: 'Order',
  localField: 'customerId',
  foreignField: 'customerId',
});

orderSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: 'customerId',
  justOne: true,
});
orderSchema.virtual('orderDetails', {
  ref: 'OrderDetail',
  localField: 'orderId',
  foreignField: 'orderId',
});

orderDetailSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: 'orderId',
  justOne: true,
});
orderDetailSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: 'productId',
  justOne: true,
});
productSchema.virtual('orderDetails', {
  ref: 'OrderDetail',
  localField: 'productId',
  foreignField: 'productId',
});

module.exports = {
  Customer: mongoose.model('Customer', customerSchema),
  Product: mongoose.model('Product', productSchema),
  Order: mongoose.model('Order', orderSchema),
  OrderDetail: mongoose.model('OrderDetail', orderDetailSchema),
};